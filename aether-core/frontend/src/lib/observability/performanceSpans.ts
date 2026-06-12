import { env } from '@/lib/config';
import { getObservabilityContext } from './errorReporter';

let sentryModule: typeof import('@sentry/react') | null = null;

async function getSentry(): Promise<typeof import('@sentry/react') | null> {
  if (!env.sentryActive) return null;
  if (!sentryModule) {
    sentryModule = await import('@sentry/react');
  }
  return sentryModule;
}

export async function withBusinessSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean | null | undefined>,
  fn: () => Promise<T>,
): Promise<T> {
  const Sentry = await getSentry();
  if (!Sentry) return fn();

  const ctx = getObservabilityContext();
  const attrs = Object.fromEntries(
    Object.entries({
      ...attributes,
      ...(ctx.tenantId ? { tenantId: ctx.tenantId } : {}),
      ...(ctx.module ? { module: ctx.module } : {}),
    }).filter(([, value]) => value !== null && value !== undefined),
  ) as Record<string, string | number | boolean>;

  return Sentry.startSpan({ name, attributes: attrs }, fn);
}

/** Test hook */
export function resetPerformanceSpansForTests(): void {
  sentryModule = null;
}
