import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { telemetry } from '../observability/telemetry';
import { logger } from '../logging/logger';
import { runWithIncomingTrace } from './sentry';

declare module 'express-serve-static-core' {
  interface Request {
    correlationId?: string;
  }
}

export function tracingMiddleware(req: Request, res: Response, next: NextFunction): void {
  runWithIncomingTrace(req, () => {
    const correlationId =
      (req.headers['x-correlation-id'] as string | undefined) ??
      (req.headers['x-request-id'] as string | undefined) ??
      randomUUID();
    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    const spanName = `http.${req.method}.${req.path}`;
    telemetry.startSpan(spanName, {
      method: req.method,
      path: req.path,
      correlationId,
    });

    res.on('finish', () => {
      telemetry.endSpan(spanName, { status: res.statusCode, correlationId });
      logger.info('http_request_traced', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        correlationId,
      });
    });

    next();
  });
}
