import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockEnv = vi.hoisted(() => ({
  sentryDsn: undefined as string | undefined,
  sentryEnv: 'test',
  sentryActive: false,
  sentryDevEnabled: false,
  sentryReplayEnabled: false,
  sentryReplaySessionRate: 0,
  sentryReplayErrorRate: 0,
  appVersion: undefined as string | undefined,
  isProd: false,
  isDev: true,
  dataSource: 'mock',
}));

vi.mock('@/lib/config', () => ({
  env: mockEnv,
}));

const loggerError = vi.fn();
const loggerWarn = vi.fn();
const loggerInfo = vi.fn();
const loggerDebug = vi.fn();

vi.mock('../logger', () => ({
  logger: {
    error: (...args: unknown[]) => loggerError(...args),
    warn: (...args: unknown[]) => loggerWarn(...args),
    info: (...args: unknown[]) => loggerInfo(...args),
    debug: (...args: unknown[]) => loggerDebug(...args),
  },
}));

describe('errorReporter', () => {
  beforeEach(() => {
    vi.resetModules();
    Object.assign(mockEnv, {
      sentryDsn: undefined,
      sentryEnv: 'test',
      sentryActive: false,
      sentryDevEnabled: false,
      sentryReplayEnabled: false,
      sentryReplaySessionRate: 0,
      sentryReplayErrorRate: 0,
      appVersion: undefined,
      isProd: false,
      isDev: true,
      dataSource: 'mock',
    });
    loggerError.mockClear();
    loggerInfo.mockClear();
    loggerDebug.mockClear();
  });

  it('reportError delegates to console logger when no Sentry DSN', async () => {
    const { initErrorReporting, reportError } = await import('../errorReporter');
    await initErrorReporting();

    const err = new Error('test failure');
    reportError(err, { source: 'test' });

    expect(loggerError).toHaveBeenCalledWith(
      'error.captured',
      expect.objectContaining({ source: 'test' }),
      err,
    );
  });

  it('initErrorReporting is idempotent', async () => {
    const { initErrorReporting } = await import('../errorReporter');
    await initErrorReporting();
    await initErrorReporting();

    expect(loggerDebug).toHaveBeenCalledTimes(1);
    expect(loggerDebug).toHaveBeenCalledWith('error_reporting.initialized', {
      provider: 'console',
    });
  });

  it('reportMessage logs at the correct level', async () => {
    const { reportMessage } = await import('../errorReporter');
    reportMessage('something happened', 'warning', { feature: 'test' });

    expect(loggerWarn).toHaveBeenCalledWith('something happened', { feature: 'test' });
  });

  it('skips auth and validation errors in console mode', async () => {
    const { ApiError } = await import('@/lib/api/errors');
    const { initErrorReporting, reportError } = await import('../errorReporter');
    await initErrorReporting();

    reportError(new ApiError('Unauthorized', 401), { source: 'api' });
    reportError(new ApiError('Invalid', 422), { source: 'api' });

    expect(loggerError).not.toHaveBeenCalled();
  });

  it('deduplicates already reported errors', async () => {
    const { initErrorReporting, markErrorAsReported, reportError } =
      await import('../errorReporter');
    await initErrorReporting();

    const err = new Error('once');
    markErrorAsReported(err);
    reportError(err, { source: 'test' });

    expect(loggerError).not.toHaveBeenCalled();
  });

  it('scrubSentryEventForTests redacts PII and sensitive keys', async () => {
    const { scrubSentryEventForTests } = await import('../errorReporter');
    const scrubbed = scrubSentryEventForTests({
      extra: {
        authorization: 'Bearer secret-token',
        email: 'merchant@example.com',
        safe: 'visible',
      },
      request: { headers: { Authorization: 'Bearer abc', 'X-Request-Id': 'req-1' } },
      user: {
        id: 'u-1',
        email: 'merchant@example.com',
        username: 'merchant',
        ip_address: '1.2.3.4',
      },
    } as unknown as import('@sentry/react').ErrorEvent);

    expect(scrubbed?.extra?.authorization).toBe('[Redacted]');
    expect(scrubbed?.extra?.email).toBe('[Redacted]');
    expect(scrubbed?.extra?.safe).toBe('visible');
    expect(scrubbed?.request?.headers?.Authorization).toBe('[Redacted]');
    expect(scrubbed?.user?.email).toBeUndefined();
    expect(scrubbed?.user?.username).toBeUndefined();
    expect(scrubbed?.user?.ip_address).toBeUndefined();
  });

  it('scrubSentryEventForTests drops auth and validation events', async () => {
    const { scrubSentryEventForTests } = await import('../errorReporter');
    expect(
      scrubSentryEventForTests({ extra: { kind: 'auth' } } as unknown as import('@sentry/react').ErrorEvent),
    ).toBeNull();
    expect(
      scrubSentryEventForTests({
        extra: { kind: 'validation' },
      } as unknown as import('@sentry/react').ErrorEvent),
    ).toBeNull();
  });
});

const sentryMocks = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({})),
  reactRouterV6BrowserTracingIntegration: vi.fn(() => ({})),
  getTraceData: vi.fn(() => ({})),
}));

vi.mock('@sentry/react', () => sentryMocks);

describe('errorReporter with Sentry active', () => {
  beforeEach(() => {
    vi.resetModules();
    Object.assign(mockEnv, {
      sentryDsn: 'https://example@ingest.sentry.io/123',
      sentryActive: true,
      appVersion: 'test-release',
    });
    sentryMocks.init.mockClear();
    sentryMocks.captureException.mockClear();
    sentryMocks.captureMessage.mockClear();
    sentryMocks.addBreadcrumb.mockClear();
    loggerError.mockClear();
    loggerInfo.mockClear();
  });

  it('initializes Sentry when DSN is active', async () => {
    const { initErrorReporting, resetErrorReporterForTests } = await import('../errorReporter');
    resetErrorReporterForTests();
    await initErrorReporting();

    expect(sentryMocks.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://example@ingest.sentry.io/123',
        environment: 'test',
        release: 'test-release',
      }),
    );
    resetErrorReporterForTests();
  });
});
