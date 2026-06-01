import { Request, Response, NextFunction } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

const memoryBuckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX ?? '120', 10);

async function redisIncrement(key: string): Promise<number | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    const { createClient } = await import('redis');
    const client = createClient({ url });
    if (!client.isOpen) await client.connect();
    const count = await client.incr(key);
    if (count === 1) await client.expire(key, Math.ceil(WINDOW_MS / 1000));
    await client.quit();
    return count;
  } catch {
    return null;
  }
}

export async function rateLimitCheck(key: string): Promise<{ allowed: boolean; remaining: number }> {
  const redisCount = await redisIncrement(`rl:${key}`);
  if (redisCount !== null) {
    return { allowed: redisCount <= MAX_REQUESTS, remaining: Math.max(0, MAX_REQUESTS - redisCount) };
  }

  const now = Date.now();
  let bucket = memoryBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    memoryBuckets.set(key, bucket);
  }
  bucket.count += 1;
  return { allowed: bucket.count <= MAX_REQUESTS, remaining: Math.max(0, MAX_REQUESTS - bucket.count) };
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
