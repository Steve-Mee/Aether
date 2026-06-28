import { useEffect } from 'react';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';
import type { ErrorEvent, EventHint } from '@sentry/react';
import { env } from '@/lib/config';
import { classifyError, shouldReportError } from '@/lib/api/errors';
import { logger } from './logger';

export interface ErrorReporter {
  captureException(error: unknown, context?: Record<string, unknown>): void;
  captureMessage(
    message: string,
    level?: 'info' | 'warning' | 'error',
    context?: Record<string, unknown>,
  ): void;
}

export interface ObservabilityContext {
  userId?: string | null;
  tenantId?: string | null;
  module?: string | null;
  pathname?: string | null;
  dataSource?: string | null;
  lastCommandIntent?: string | null;
  lastCommandId?: string | null;
  lastCommandSuccess?: boolean | null;
}

const SENSITIVE_KEYS = new Set([
  'authorization',
  'accesstoken',
  'access_token',
  'token',
  'password',
  'email',
  'apikey',
  'api_key',
  'x-aether-api-key',
  'cookie',
  'set-cookie',
]);

const reportedErrors = new WeakSet<object>();

class ConsoleErrorReporter implements ErrorReporter {
  captureException(error: unknown, context?: Record<string, unknown>): void {
    logger.error('error.captured', context, error);
  }

  captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'error',
    context?: Record<string, unknown>,
  ): void {
    const log = level === 'info' ? logger.info : level === 'warning' ? logger.warn : logger.error;
    log(message, context);
  }
}

let reporter: ErrorReporter = new ConsoleErrorReporter();
let initialized = false;
let pendingContext: ObservabilityContext = {};
let sentryModule: typeof import('@sentry/react') | null = null;

function truncate(value: string, max = 80): string {
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase());
}

function scrubValue(key: string, value: unknown): unknown {
  if (isSensitiveKey(key)) return '[Redacted]';
  if (typeof value === 'string') {
    if (/^Bearer\s+/i.test(value)) return '[Redacted]';
    if (key.toLowerCase().includes('command') && value.length > 80) {
      return truncate(value);
    }
  }
  return value;
}

function scrubRecord(
  record: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!record) return record;
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      next[key] = scrubRecord(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      next[key] = value.map((item) =>
        item && typeof item === 'object'
          ? scrubRecord(item as Record<string, unknown>)
          : scrubValue(key, item),
      );
    } else {
      next[key] = scrubValue(key, value);
    }
  }
  return next;
}

function scrubSentryEvent(event: ErrorEvent): ErrorEvent | null {
  const extra = event.extra as Record<string, unknown> | undefined;
  if (extra) {
    event.extra = scrubRecord(extra);
    const kind = extra.kind as string | undefined;
    const source = extra.source as string | undefined;
    if (kind === 'auth' || kind === 'validation') return null;
    if (source === 'query' && extra.transportReported === true) return null;
  }

  if (event.request?.headers) {
    const headers = event.request.headers as Record<string, string>;
    for (const key of Object.keys(headers)) {
      if (isSensitiveKey(key)) headers[key] = '[Redacted]';
    }
  }

  if (event.user?.email) delete event.user.email;
  if (event.user?.username) delete event.user.username;
  if (event.user?.ip_address) delete event.user.ip_address;

  return event;
}

function applyObservabilityContext(): void {
  if (!sentryModule) return;
  const Sentry = sentryModule;

  if (pendingContext.userId) {
    Sentry.setUser({ id: pendingContext.userId });
  } else if (pendingContext.userId === null) {
    Sentry.setUser(null);
  }

  if (pendingContext.tenantId) {
    Sentry.setTag('tenantId', pendingContext.tenantId);
  }
  if (pendingContext.module) {
    Sentry.setTag('module', pendingContext.module);
  }
  if (pendingContext.dataSource) {
    Sentry.setTag('dataSource', pendingContext.dataSource);
  }

  const routeContext: Record<string, unknown> = {};
  if (pendingContext.pathname) routeContext.pathname = pendingContext.pathname;
  if (pendingContext.lastCommandIntent) {
    routeContext.lastCommandIntent = truncate(pendingContext.lastCommandIntent);
  }
  if (pendingContext.lastCommandId) routeContext.lastCommandId = pendingContext.lastCommandId;
  if (
    pendingContext.lastCommandSuccess !== undefined &&
    pendingContext.lastCommandSuccess !== null
  ) {
    routeContext.lastCommandSuccess = pendingContext.lastCommandSuccess;
  }
  if (Object.keys(routeContext).length > 0) {
    Sentry.setContext('aether', routeContext);
  }
}

export function setObservabilityContext(ctx: Partial<ObservabilityContext>): void {
  pendingContext = { ...pendingContext, ...ctx };
  applyObservabilityContext();
}

/** Read-only snapshot for performance spans and tests. */
export function getObservabilityContext(): Readonly<ObservabilityContext> {
  return { ...pendingContext };
}

/** Test hook — scrub logic used by beforeSend. */
export function scrubSentryEventForTests(event: ErrorEvent): ErrorEvent | null {
  return scrubSentryEvent(event);
}

export function markErrorAsReported(error: unknown): void {
  if (error && typeof error === 'object') {
    reportedErrors.add(error);
  }
}

export function isErrorAlreadyReported(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && reportedErrors.has(error));
}

function shouldCaptureError(error: unknown, context?: Record<string, unknown>): boolean {
  if (context?.aborted === true) return false;
  if (isErrorAlreadyReported(error)) return false;
  return shouldReportError(error);
}

async function loadSentryReporter(): Promise<ErrorReporter | null> {
  if (!env.sentryActive) return null;
  try {
    const Sentry = await import('@sentry/react');
    sentryModule = Sentry;

    const integrations = [
      Sentry.browserTracingIntegration(),
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ];

    if (env.sentryReplayEnabled) {
      integrations.push(
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      );
    }

    Sentry.init({
      dsn: env.sentryDsn,
      environment: env.sentryEnv,
      release: env.appVersion,
      integrations,
      tracesSampleRate: env.isProd ? 0.1 : 1.0,
      replaysSessionSampleRate: env.sentryReplayEnabled ? env.sentryReplaySessionRate : 0,
      replaysOnErrorSampleRate: env.sentryReplayEnabled ? env.sentryReplayErrorRate : 0,
      beforeSend(event: ErrorEvent, hint: EventHint): ErrorEvent | null {
        const original = hint.originalException;
        if (original && !shouldReportError(original)) return null;
        return scrubSentryEvent(event);
      },
    });

    applyObservabilityContext();

    return {
      captureException(error, context) {
        Sentry.captureException(error, context ? { extra: context } : undefined);
      },
      captureMessage(message, level = 'error', context) {
        const sentryLevel = level === 'info' ? 'info' : level === 'warning' ? 'warning' : 'error';
        Sentry.captureMessage(message, { level: sentryLevel, extra: context });
        Sentry.addBreadcrumb({
          category: 'business',
          message,
          level: sentryLevel,
          data: context as Record<string, unknown> | undefined,
        });
      },
    };
  } catch (err) {
    logger.warn('sentry.init_failed', undefined, err);
    return null;
  }
}

/** Initialize error reporting — call once at app bootstrap. */
export async function initErrorReporting(): Promise<void> {
  if (initialized) return;
  initialized = true;

  setObservabilityContext({ dataSource: env.dataSource });

  const sentryReporter = await loadSentryReporter();
  if (sentryReporter) {
    reporter = {
      captureException(error, context) {
        if (!shouldCaptureError(error, context)) return;
        markErrorAsReported(error);
        new ConsoleErrorReporter().captureException(error, {
          ...context,
          kind: classifyError(error).kind,
        });
        sentryReporter.captureException(error, {
          ...context,
          kind: classifyError(error).kind,
        });
      },
      captureMessage(message, level, context) {
        new ConsoleErrorReporter().captureMessage(message, level, context);
        sentryReporter.captureMessage(message, level, context);
      },
    };
    logger.info('error_reporting.initialized', { provider: 'sentry' });
  } else {
    reporter = {
      captureException(error, context) {
        if (!shouldCaptureError(error, context)) return;
        markErrorAsReported(error);
        new ConsoleErrorReporter().captureException(error, {
          ...context,
          kind: classifyError(error).kind,
        });
      },
      captureMessage(message, level, context) {
        new ConsoleErrorReporter().captureMessage(message, level, context);
      },
    };
    logger.debug('error_reporting.initialized', { provider: 'console' });
  }
}

export function reportError(error: unknown, context?: Record<string, unknown>): void {
  reporter.captureException(error, context);
}

export function reportMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'error',
  context?: Record<string, unknown>,
): void {
  reporter.captureMessage(message, level, context);
}

/** Dev/staging hook — call from browser console: `__aetherProbeSentryError()` */
export function installObservabilityProbe(): void {
  if (!env.sentryActive) return;
  if (!env.sentryDevEnabled && env.sentryEnv !== 'staging') return;
  const win = window as Window & { __aetherProbeSentryError?: () => void };
  win.__aetherProbeSentryError = () => {
    reportError(new Error('AETHER observability probe — intentional frontend error'), {
      source: 'observability.probe',
    });
  };
}

export function installGlobalErrorHandlers(): void {
  window.addEventListener('error', (event) => {
    reportError(event.error ?? event.message, {
      source: 'window.onerror',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason, { source: 'unhandledrejection' });
  });
}

/** Propagate active trace to backend via fetch headers. */
export function getSentryTraceHeaders(): Record<string, string> {
  if (!sentryModule || !env.sentryActive) return {};
  const data = sentryModule.getTraceData();
  const headers: Record<string, string> = {};
  if (data['sentry-trace']) headers['sentry-trace'] = data['sentry-trace'];
  if (data.baggage) headers.baggage = data.baggage;
  return headers;
}

/** Test hook — reset to console-only reporter. */
export function resetErrorReporterForTests(): void {
  reporter = new ConsoleErrorReporter();
  initialized = false;
  pendingContext = {};
  sentryModule = null;
}
