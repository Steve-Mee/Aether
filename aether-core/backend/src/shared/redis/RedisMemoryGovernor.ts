import { getRedisClient } from './createRedisClient';
import { logger } from '../logging/logger';
import {
  classifyRedisKey,
  HOT_RL_SCAN_PATTERN,
  RUNMEM_SCAN_PATTERN,
} from './redisKeyClass';
import { redisSpillStore } from './RedisSpillStore';
import {
  isRedisSpillEnabled,
  resolveRedisMemoryGovernorMs,
  resolveRedisMemoryHardRatio,
  resolveRedisMemorySoftRatio,
} from './redisSpillConfig';

export type RedisPressureLevel = 'normal' | 'soft' | 'hard';

let pressureLevel: RedisPressureLevel = 'normal';
let timer: NodeJS.Timeout | null = null;

/** Test / RL helper: when hard, prefer spill path for counters. */
export function getRedisPressureLevel(): RedisPressureLevel {
  return pressureLevel;
}

/** Test helper only. */
export function setRedisPressureLevelForTests(level: RedisPressureLevel): void {
  pressureLevel = level;
}

interface MemoryInfo {
  used: number;
  max: number;
}

async function readMemoryInfo(): Promise<MemoryInfo | null> {
  const client = await getRedisClient();
  if (!client) return null;
  try {
    const info = await client.info('memory');
    const usedMatch = /used_memory:(\d+)/.exec(info);
    const maxMatch = /maxmemory:(\d+)/.exec(info);
    const used = usedMatch ? parseInt(usedMatch[1], 10) : 0;
    let max = maxMatch ? parseInt(maxMatch[1], 10) : 0;
    // When maxmemory is 0 (unlimited), use a synthetic ceiling from used + headroom
    // so soft/hard never fire falsely; only act when maxmemory is configured.
    if (!max || max <= 0) return { used, max: 0 };
    return { used, max };
  } catch {
    return null;
  }
}

async function scanKeys(pattern: string, count = 100): Promise<string[]> {
  const client = await getRedisClient();
  if (!client) return [];
  const keys: string[] = [];
  try {
    let cursor = 0;
    do {
      const reply = await client.scan(cursor, { MATCH: pattern, COUNT: count });
      cursor = reply.cursor;
      keys.push(...reply.keys);
      if (keys.length >= 2000) break;
    } while (cursor !== 0);
  } catch {
    return keys;
  }
  return keys;
}

/**
 * Soft: demote spillable runmem cache keys (durable in Postgres inner adapter).
 * Hard: spill hot RL counters to Postgres then DEL Redis.
 * Never DEL without durable write first.
 */
export class RedisMemoryGovernor {
  async tick(): Promise<{ level: RedisPressureLevel; demoted: number; spilled: number }> {
    if (!isRedisSpillEnabled()) {
      pressureLevel = 'normal';
      return { level: 'normal', demoted: 0, spilled: 0 };
    }

    await redisSpillStore.purgeExpired().catch(() => 0);

    const mem = await readMemoryInfo();
    if (!mem || mem.max <= 0) {
      pressureLevel = 'normal';
      return { level: 'normal', demoted: 0, spilled: 0 };
    }

    const ratio = mem.used / mem.max;
    const soft = resolveRedisMemorySoftRatio();
    const hard = resolveRedisMemoryHardRatio();

    let demoted = 0;
    let spilled = 0;

    if (ratio >= hard) {
      pressureLevel = 'hard';
      spilled = await this.spillHotKeys();
      demoted = await this.demoteSpillableKeys();
      logger.warn('redis_memory_spill_hard', {
        used: mem.used,
        max: mem.max,
        ratio,
        spilled,
        demoted,
      });
    } else if (ratio >= soft) {
      pressureLevel = 'soft';
      demoted = await this.demoteSpillableKeys();
      logger.info('redis_memory_spill_soft', {
        used: mem.used,
        max: mem.max,
        ratio,
        demoted,
      });
    } else {
      pressureLevel = 'normal';
    }

    return { level: pressureLevel, demoted, spilled };
  }

  private async demoteSpillableKeys(): Promise<number> {
    const client = await getRedisClient();
    if (!client) return 0;
    const keys = await scanKeys(RUNMEM_SCAN_PATTERN);
    let n = 0;
    for (const key of keys) {
      if (classifyRedisKey(key) !== 'spillable') continue;
      try {
        const value = await client.get(key);
        if (value != null) {
          // Persist snapshot in spill (runmem also lives in Postgres via inner port).
          await redisSpillStore.upsert(key, value, 'spillable', null);
        }
        await client.del(key);
        n += 1;
      } catch {
        // continue
      }
    }
    return n;
  }

  private async spillHotKeys(): Promise<number> {
    const client = await getRedisClient();
    if (!client) return 0;
    const keys = await scanKeys(HOT_RL_SCAN_PATTERN);
    let n = 0;
    for (const key of keys) {
      if (classifyRedisKey(key) !== 'hot') continue;
      try {
        const value = await client.get(key);
        const ttl = await client.ttl(key);
        if (value != null) {
          const expiresAt =
            typeof ttl === 'number' && ttl > 0 ? new Date(Date.now() + ttl * 1000) : null;
          // Prefer structured window JSON when value is a bare counter.
          const asNum = Number(value);
          const payload =
            Number.isFinite(asNum) && !value.startsWith('{')
              ? JSON.stringify({
                  count: asNum,
                  resetAt: expiresAt ? expiresAt.getTime() : Date.now() + 60_000,
                })
              : value;
          await redisSpillStore.upsert(key, payload, 'hot', expiresAt);
        }
        await client.del(key);
        n += 1;
      } catch {
        // continue
      }
    }
    return n;
  }

  start(): void {
    if (!process.env.REDIS_URL || !isRedisSpillEnabled()) {
      logger.info('redis_memory_governor_skipped');
      return;
    }
    const ms = resolveRedisMemoryGovernorMs();
    void this.tick();
    timer = setInterval(() => void this.tick(), ms);
    logger.info('redis_memory_governor_started', { intervalMs: ms });
  }

  stop(): void {
    if (timer) clearInterval(timer);
    timer = null;
  }
}

export const redisMemoryGovernor = new RedisMemoryGovernor();
