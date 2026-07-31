/**
 * Typed runtime configuration — single source for all VITE_* env reads.
 * Import from '@/lib/config' instead of import.meta.env in application code.
 */

function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isTruthy(value: unknown): boolean {
  return value === 'true' || value === '1';
}

function isFalsy(value: unknown): boolean {
  return value === 'false' || value === '0';
}

function parseDataSource(value: unknown): 'live' | 'mock' {
  const s = optionalString(value)?.toLowerCase();
  return s === 'mock' ? 'mock' : 'live';
}

/** VITE_USE_MOCK takes precedence over VITE_DATA_SOURCE. */
export function resolveDataSource(useMock: unknown, dataSource: unknown): 'live' | 'mock' {
  const mockFlag = optionalString(useMock);
  if (mockFlag !== undefined) {
    if (isTruthy(useMock)) return 'mock';
    if (isFalsy(useMock)) return 'live';
  }
  return parseDataSource(dataSource);
}

/** VITE_API_BASE_URL takes precedence over VITE_API_URL. */
export function resolveApiUrl(baseUrl: unknown, apiUrl: unknown): string {
  return optionalString(baseUrl) ?? optionalString(apiUrl) ?? '';
}

export function parseHybridDemo(value: unknown, isDev: boolean): boolean {
  if (value === undefined || value === '') return isDev;
  if (isFalsy(value)) return false;
  if (isTruthy(value)) return true;
  return isDev;
}

export function parseAuthProvider(value: unknown): 'stub' | 'jwt' {
  const s = optionalString(value)?.toLowerCase();
  return s === 'jwt' ? 'jwt' : 'stub';
}

export function parseSampleRate(value: unknown, fallback: number): number {
  const s = optionalString(value);
  if (s === undefined) return fallback;
  const n = Number.parseFloat(s);
  if (Number.isNaN(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

function parseLogLevel(value: unknown): 'debug' | 'info' | 'warn' | 'error' {
  const s = optionalString(value)?.toLowerCase();
  if (s === 'debug' || s === 'info' || s === 'warn' || s === 'error') return s;
  return 'info';
}

const dataSource = resolveDataSource(
  import.meta.env.VITE_USE_MOCK,
  import.meta.env.VITE_DATA_SOURCE,
);

export const env = {
  apiUrl: resolveApiUrl(import.meta.env.VITE_API_BASE_URL, import.meta.env.VITE_API_URL),
  apiKey: optionalString(import.meta.env.VITE_AETHER_API_KEY) ?? 'dev-api-key-change-in-production',
  tenantId: optionalString(import.meta.env.VITE_AETHER_TENANT) ?? 'tenant_default',
  dataSource,
  isMockMode: dataSource === 'mock',
  isLiveMode: dataSource === 'live',
  suppliersDemo: isTruthy(import.meta.env.VITE_SUPPLIERS_DEMO),
  liveDemo: isTruthy(import.meta.env.VITE_LIVE_DEMO),
  hybridDemo: parseHybridDemo(import.meta.env.VITE_HYBRID_DEMO, import.meta.env.DEV),
  merchantDisplayName: optionalString(import.meta.env.VITE_MERCHANT_DISPLAY_NAME),
  authProvider: parseAuthProvider(import.meta.env.VITE_AUTH_PROVIDER),
  authAutoLogin: isTruthy(import.meta.env.VITE_AUTH_AUTO_LOGIN),
  logLevel: parseLogLevel(import.meta.env.VITE_LOG_LEVEL),
  sentryDsn: optionalString(import.meta.env.VITE_SENTRY_DSN),
  sentryEnv: optionalString(import.meta.env.VITE_SENTRY_ENV) ?? import.meta.env.MODE,
  sentryDevEnabled: isTruthy(import.meta.env.VITE_SENTRY_DEV),
  sentryReplayEnabled: isTruthy(import.meta.env.VITE_SENTRY_REPLAY_ENABLED) || import.meta.env.PROD,
  sentryReplaySessionRate: parseSampleRate(import.meta.env.VITE_SENTRY_REPLAY_SESSION_RATE, 0),
  sentryReplayErrorRate: parseSampleRate(
    import.meta.env.VITE_SENTRY_REPLAY_ERROR_RATE,
    import.meta.env.PROD ? 0.1 : 0,
  ),
  sentryActive:
    Boolean(optionalString(import.meta.env.VITE_SENTRY_DSN)) &&
    (!import.meta.env.DEV || isTruthy(import.meta.env.VITE_SENTRY_DEV)),
  appVersion: optionalString(import.meta.env.VITE_APP_VERSION),
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;

export type Env = typeof env;

/** Debug/settings panel — safe subset (no secrets). */
export function getRuntimeConfig(): {
  apiUrl: string;
  tenantId: string;
  dataSource: 'live' | 'mock';
  suppliersDemo: boolean;
  liveDemo: boolean;
  hybridDemo: boolean;
  merchantDisplayName?: string;
  isDev: boolean;
  sentryEnabled: boolean;
} {
  return {
    apiUrl: env.apiUrl || 'http://localhost:9000',
    tenantId: env.tenantId,
    dataSource: env.dataSource,
    suppliersDemo: env.suppliersDemo,
    liveDemo: env.liveDemo,
    hybridDemo: env.hybridDemo,
    merchantDisplayName: env.merchantDisplayName,
    isDev: env.isDev,
    sentryEnabled: env.sentryActive,
  };
}

if (env.isDev && !optionalString(import.meta.env.VITE_AETHER_API_KEY)) {
  console.warn('[AETHER] VITE_AETHER_API_KEY is not set — using dev fallback.');
}

if (env.isProd && env.apiKey === 'dev-api-key-change-in-production') {
  console.warn(
    '[AETHER] Production build is using the default dev API key — set VITE_AETHER_API_KEY.',
  );
}
