import * as Sentry from '@sentry/node';
import type { ErrorEvent, EventHint } from '@sentry/core';
import type { Request } from 'express';

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'accesstoken',
  'access_token',
  'token',
  'password',
  'email',
  'apikey',
  'x-aether-api-key',
]);

function isTruthy(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

function scrubValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEYS.has(key.toLowerCase())) return '[Redacted]';
  if (typeof value === 'string' && /^Bearer\s+/i.test(value)) return '[Redacted]';
  return value;
}

function scrubRecord(record: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!record) return record;
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      next[key] = scrubRecord(value as Record<string, unknown>);
    } else {
      next[key] = scrubValue(key, value);
    }
  }
  return next;
}

function scrubSentryEvent(event: ErrorEvent): ErrorEvent | null {
  if (event.extra) event.extra = scrubRecord(event.extra as Record<string, unknown>);
  if (event.request?.headers) {
    const headers = event.request.headers as Record<string, string>;
    for (const key of Object.keys(headers)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) headers[key] = '[Redacted]';
    }
  }
  if (event.user?.email) delete event.user.email;
  if (event.user?.ip_address) delete event.user.ip_address;
  return event;
}

export function isSentryEnvActive(): boolean {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return false;
  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  if (isDev && !isTruthy(process.env.SENTRY_DEV)) return false;
  return true;
}

export function initSentry(): boolean {
  if (!isSentryEnvActive()) return false;
  if (Sentry.isInitialized()) return true;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV ?? 'development',
    release: process.env.APP_VERSION,
    integrations: [Sentry.expressIntegration(), Sentry.httpIntegration()],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event: ErrorEvent, hint: EventHint): ErrorEvent | null {
      const status = (event.contexts as { response?: { status_code?: number } } | undefined)
        ?.response?.status_code;
      if (typeof status === 'number' && status >= 400 && status < 500) return null;
      const original = hint.originalException as { statusCode?: number } | undefined;
      if (typeof original?.statusCode === 'number' && original.statusCode >= 400 && original.statusCode < 500) {
        return null;
      }
      return scrubSentryEvent(event);
    },
  });

  return true;
}

export function isSentryEnabled(): boolean {
  return Sentry.isInitialized();
}

/** Report 5xx and unexpected errors — not 4xx client errors. */
export function shouldReportServerError(statusCode = 500): boolean {
  return statusCode >= 500;
}

export function captureServerException(
  err: unknown,
  context?: Record<string, unknown>
): void {
  if (!Sentry.isInitialized()) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}

export function applySentryRequestContext(req: Request): void {
  if (!Sentry.isInitialized()) return;
  if (req.actorId) Sentry.setUser({ id: req.actorId });
  if (req.tenantId) Sentry.setTag('tenantId', req.tenantId);
  if (req.correlationId) Sentry.setTag('correlationId', req.correlationId);
}

export function runWithIncomingTrace(req: Request, fn: () => void): void {
  if (!Sentry.isInitialized()) {
    fn();
    return;
  }
  const sentryTrace = req.headers['sentry-trace'] as string | undefined;
  const baggage = req.headers['baggage'] as string | undefined;
  if (!sentryTrace) {
    fn();
    return;
  }
  Sentry.continueTrace({ sentryTrace, baggage }, fn);
}

export async function withServerSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: () => Promise<T>
): Promise<T> {
  if (!Sentry.isInitialized()) return fn();
  return Sentry.startSpan({ name, attributes }, fn);
}

export async function shutdownSentry(timeoutMs = 2000): Promise<void> {
  if (!Sentry.isInitialized()) return;
  await Sentry.close(timeoutMs);
}

export { setupExpressErrorHandler } from '@sentry/node';
