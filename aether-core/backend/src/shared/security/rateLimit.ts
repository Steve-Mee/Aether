import { Request, Response, NextFunction } from 'express';
import { getRedisPressureLevel } from '../redis/RedisMemoryGovernor';
import { redisSpillStore } from '../redis/RedisSpillStore';

interface Bucket {
  count: number;
  resetAt: number;
}

const memoryBuckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX ?? '120', 10);

function isRedisOomError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /OOM|maxmemory|NOSPC|MISCONF/i.test(msg);
}

/**
 * Shared fixed-window increment: Redis → spill (hard pressure / OOM) → process memory.
 * Never loses the counter: spill UPSERT before abandoning Redis.
 */
export async function incrementFixedWindow(
  redisKey: string,
  opts: { windowMs: number; max: number }
): Promise<{ allowed: boolean; remaining: number }> {
  const { windowMs, max } = opts;
  const pressure = getRedisPressureLevel();

  if (pressure !== 'hard') {
    try {
      const { getRedisClient } = await import('../redis/createRedisClient');
      const client = await getRedisClient();
      if (client) {
        const count = await client.incr(redisKey);
        if (count === 1) await client.expire(redisKey, Math.ceil(windowMs / 1000));
        return {
          allowed: count <= max,
          remaining: Math.max(0, max - count),
        };
      }
    } catch (err) {
      if (isRedisOomError(err)) {
        try {
          const count = await redisSpillStore.incrWindow(redisKey, windowMs, 'hot');
          return {
            allowed: count <= max,
            remaining: Math.max(0, max - count),
          };
        } catch {
          // fall through to memory
        }
      }
    }
  } else {
    try {
      const count = await redisSpillStore.incrWindow(redisKey, windowMs, 'hot');
      return {
        allowed: count <= max,
        remaining: Math.max(0, max - count),
      };
    } catch {
      // fall through to memory
    }
  }

  const now = Date.now();
  let bucket = memoryBuckets.get(redisKey);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    memoryBuckets.set(redisKey, bucket);
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= max,
    remaining: Math.max(0, max - bucket.count),
  };
}

export async function rateLimitCheck(key: string): Promise<{ allowed: boolean; remaining: number }> {
  return incrementFixedWindow(`rl:${key}`, {
    windowMs: WINDOW_MS,
    max: MAX_REQUESTS,
  });
}

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/health') {
    next();
    return;
  }

  const key = `${req.tenantId ?? 'anon'}:${req.ip ?? 'unknown'}`;
  void rateLimitCheck(key).then(({ allowed, remaining }) => {
    res.setHeader('X-RateLimit-Limit', String(MAX_REQUESTS));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    if (!allowed) {
      res.status(429).json({ error: 'Rate limit exceeded' });
      return;
    }
    next();
  });
}

/** Test helper: clear in-memory buckets. */
export function resetRateLimitMemoryForTests(): void {
  memoryBuckets.clear();
}
