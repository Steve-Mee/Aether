import { prisma } from '../prisma/client';
import type { RedisKeyPriority } from './redisKeyClass';
import { isRedisSpillEnabled } from './redisSpillConfig';

export interface SpillEntry {
  key: string;
  value: string;
  priority: RedisKeyPriority;
  expiresAt: Date | null;
}

/**
 * Durable Postgres spill for Redis keys under memory pressure.
 * Never drops data: UPSERT before Redis DEL.
 */
export class RedisSpillStore {
  async upsert(
    key: string,
    value: string,
    priority: RedisKeyPriority,
    expiresAt: Date | null = null
  ): Promise<void> {
    if (!isRedisSpillEnabled()) return;
    await prisma.redisSpill.upsert({
      where: { key },
      create: { key, value, priority, expiresAt },
      update: { value, priority, expiresAt },
    });
  }

  async get(key: string): Promise<SpillEntry | null> {
    if (!isRedisSpillEnabled()) return null;
    const row = await prisma.redisSpill.findUnique({ where: { key } });
    if (!row) return null;
    if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
      await prisma.redisSpill.delete({ where: { key } }).catch(() => undefined);
      return null;
    }
    return {
      key: row.key,
      value: row.value,
      priority: row.priority as RedisKeyPriority,
      expiresAt: row.expiresAt,
    };
  }

  async delete(key: string): Promise<void> {
    if (!isRedisSpillEnabled()) return;
    await prisma.redisSpill.delete({ where: { key } }).catch(() => undefined);
  }

  /** Fixed-window counter increment stored as JSON `{ count, resetAt }`. */
  async incrWindow(
    key: string,
    windowMs: number,
    priority: RedisKeyPriority = 'hot'
  ): Promise<number> {
    const now = Date.now();
    const existing = await this.get(key);
    let count = 1;
    let resetAt = now + windowMs;
    if (existing) {
      try {
        const parsed = JSON.parse(existing.value) as { count?: number; resetAt?: number };
        if (
          typeof parsed.resetAt === 'number' &&
          parsed.resetAt > now &&
          typeof parsed.count === 'number'
        ) {
          count = parsed.count + 1;
          resetAt = parsed.resetAt;
        }
      } catch {
        // reset window
      }
    }
    await this.upsert(
      key,
      JSON.stringify({ count, resetAt }),
      priority,
      new Date(resetAt)
    );
    return count;
  }

  async purgeExpired(limit = 500): Promise<number> {
    if (!isRedisSpillEnabled()) return 0;
    const now = new Date();
    const expired = await prisma.redisSpill.findMany({
      where: { expiresAt: { lte: now } },
      select: { key: true },
      take: limit,
    });
    if (expired.length === 0) return 0;
    await prisma.redisSpill.deleteMany({
      where: { key: { in: expired.map((e) => e.key) } },
    });
    return expired.length;
  }
}

export const redisSpillStore = new RedisSpillStore();
