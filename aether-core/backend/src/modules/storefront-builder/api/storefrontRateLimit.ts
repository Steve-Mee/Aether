import { NextFunction, Request, Response } from 'express';
import { incrementFixedWindow, resetRateLimitMemoryForTests } from '../../../shared/security/rateLimit';

/**
 * Public storefront rate limit (P04 / P15).
 *
 * - Redis fixed window per IP (`rl:sf:${ip}`) when REDIS_URL is set.
 * - Falls back to process memory, then Postgres spill under hard Redis pressure.
 * - Locked Appendix G: **60 req/min/IP**.
 */

/** Locked Appendix G: 60 requests per minute per IP. */
export const STOREFRONT_PUBLIC_RATE_LIMIT_MAX_DEFAULT = 60;

/** Fixed window length for public storefront IP rate limit (1 minute). */
export const STOREFRONT_PUBLIC_RATE_LIMIT_WINDOW_MS = 60_000;

function maxRequests(): number {
  const raw = process.env.STOREFRONT_PUBLIC_RATE_LIMIT_MAX;
  if (raw === undefined || raw === '') return STOREFRONT_PUBLIC_RATE_LIMIT_MAX_DEFAULT;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : STOREFRONT_PUBLIC_RATE_LIMIT_MAX_DEFAULT;
}

function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

export function storefrontRateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const max = maxRequests();
  const redisKey = `rl:sf:${clientIp(req)}`;
  void incrementFixedWindow(redisKey, {
    windowMs: STOREFRONT_PUBLIC_RATE_LIMIT_WINDOW_MS,
    max,
  }).then(({ allowed, remaining }) => {
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    if (!allowed) {
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Storefront rate limit exceeded',
        },
      });
      return;
    }
    next();
  });
}

/** Test helper: clear in-memory buckets used by shared RL helper. */
export function resetStorefrontRateLimitForTests(): void {
  resetRateLimitMemoryForTests();
}
