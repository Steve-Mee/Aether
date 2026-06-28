import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { classifyError, shouldReportError } from '@/lib/api/errors';
import { isErrorAlreadyReported, reportError } from '@/lib/observability/errorReporter';
import { logger } from '@/lib/observability/logger';

function queryRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  return classifyError(error).retryable;
}

/** Shared stale/gc tuning for heavy or stable queries. */
export const queryTiming = {
  defaultStale: 30_000,
  settingsStale: 5 * 60_000,
  settingsGc: 30 * 60_000,
  activityStale: 60_000,
  activityGc: 10 * 60_000,
  insightsStale: 60_000,
  insightsGc: 10 * 60_000,
  drawerStale: 2 * 60_000,
  drawerGc: 5 * 60_000,
} as const;

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const classified = classifyError(error);
      const context = {
        key: query.queryKey,
        domain: (query.meta as { domain?: string } | undefined)?.domain,
        kind: classified.kind,
        status: classified.status,
      };
      logger.error('query.failed', context, error);
      if (shouldReportError(error) && !isErrorAlreadyReported(error)) {
        reportError(error, { ...context, source: 'query' });
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      const meta = mutation.meta as { handled?: boolean; domain?: string } | undefined;
      if (meta?.handled) return;
      const classified = classifyError(error);
      const context = {
        domain: meta?.domain,
        kind: classified.kind,
        status: classified.status,
      };
      logger.error('mutation.failed', context, error);
      if (shouldReportError(error) && !isErrorAlreadyReported(error)) {
        reportError(error, { ...context, source: 'mutation' });
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: queryTiming.defaultStale,
      retry: queryRetry,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
