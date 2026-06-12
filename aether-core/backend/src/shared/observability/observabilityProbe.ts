import { isSentryEnabled, isSentryEnvActive } from './sentry';

/** Whether intentional Sentry probe errors are allowed (never in production). */
export function isObservabilityProbeAllowed(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.OBSERVABILITY_PROBE_ENABLED === 'true') return true;
  if (process.env.NODE_ENV === 'staging') return true;
  if (process.env.SENTRY_DEV === 'true' || process.env.SENTRY_DEV === '1') return true;
  return false;
}

export function getObservabilityStatus(): {
  sentryActive: boolean;
  environment: string;
  release: string | null;
  probeAllowed: boolean;
} {
  return {
    sentryActive: isSentryEnvActive() && isSentryEnabled(),
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV ?? 'development',
    release: process.env.APP_VERSION ?? null,
    probeAllowed: isObservabilityProbeAllowed(),
  };
}
