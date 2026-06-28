import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import type { AutonomyMetricsResponse } from '@/types/insight';
import { invalidateHomeLandingQueries } from '@/lib/query/invalidateHomeLanding';

function bumpAllCachedAutonomyMetrics(
  queryClient: QueryClient,
  patchFn: (current: AutonomyMetricsResponse) => Partial<AutonomyMetricsResponse>,
): void {
  const entries = queryClient.getQueriesData<AutonomyMetricsResponse>({
    queryKey: ['autonomy-metrics'],
  });
  for (const [key, current] of entries) {
    if (!current) continue;
    queryClient.setQueryData<AutonomyMetricsResponse>(key, { ...current, ...patchFn(current) });
  }
}

/** Optimistic metric bump before refetch (insights UX). */
export function optimisticInsightsBump(
  queryClient: QueryClient,
  kind: 'command' | 'approval',
): void {
  const hasCached = queryClient
    .getQueriesData<AutonomyMetricsResponse>({ queryKey: ['autonomy-metrics'] })
    .some(([, data]) => Boolean(data));
  if (!hasCached) return;

  if (kind === 'command') {
    bumpAllCachedAutonomyMetrics(queryClient, (current) => ({
      totalDecisions: current.totalDecisions + 1,
      autonomousDecisions: current.autonomousDecisions + 1,
    }));
  } else {
    bumpAllCachedAutonomyMetrics(queryClient, (current) => ({
      totalDecisions: current.totalDecisions + 1,
      humanGatedDecisions: current.humanGatedDecisions + 1,
    }));
  }
}

/** Shared cache invalidation after domain mutations. */
export function invalidateAfterApprovalChange(queryClient: QueryClient): void {
  optimisticInsightsBump(queryClient, 'approval');
  void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
  void queryClient.invalidateQueries({ queryKey: ['activity'] });
  void queryClient.invalidateQueries({ queryKey: ['aether-overview'] });
  invalidateHomeLandingQueries(queryClient);
  void queryClient.invalidateQueries({ queryKey: queryKeys.outcomes() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.autonomyMetrics() });
}

export function invalidateAfterCommandChange(queryClient: QueryClient): void {
  optimisticInsightsBump(queryClient, 'command');
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all() });
  void queryClient.invalidateQueries({ queryKey: ['activity'] });
  void queryClient.invalidateQueries({ queryKey: ['aether-overview'] });
  invalidateHomeLandingQueries(queryClient);
  void queryClient.invalidateQueries({ queryKey: queryKeys.autonomyMetrics() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.outcomes() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.commands.history() });
}

export function invalidateAfterSupplierChange(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all() });
  void queryClient.invalidateQueries({ queryKey: ['activity'] });
  void queryClient.invalidateQueries({ queryKey: ['aether-overview'] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
}

export function invalidateAfterTruthReview(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.operatingMetrics() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.truthStatus() });
}
