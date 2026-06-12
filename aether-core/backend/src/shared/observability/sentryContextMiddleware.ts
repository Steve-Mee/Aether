import { Request, Response, NextFunction } from 'express';
import { applySentryRequestContext } from './sentry';

/** Apply Sentry user/tenant tags after auth middleware has set actorId and tenantId. */
export function sentryContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  applySentryRequestContext(req);
  next();
}
