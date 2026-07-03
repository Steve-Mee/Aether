import type { QueryClient } from '@tanstack/react-query';
import {
  activityRepository,
  approvalsRepository,
  autonomousRepository,
  dashboardRepository,
  emailsRepository,
  insightsRepository,
  settingsRepository,
  suppliersRepository,
} from '@/lib/data';
import { overviewApi } from '@/features/aether-overview/api/overviewApi';
import { queryKeys } from '@/lib/query/keys';
import { queryTiming } from '@/lib/query/client';
import { COMMAND_CENTER_PATH } from './routes';
import { moduleLinks } from './moduleLinks';

/** Prefetch primary queries when hovering sidebar nav — makes route changes feel instant. */
export function prefetchNavRoute(queryClient: QueryClient, path: string): void {
  const staleTime = queryTiming.defaultStale;

  if (path === COMMAND_CENTER_PATH) {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard(),
      queryFn: () => dashboardRepository.fetch(),
      staleTime,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.activity({ days: 7, limit: 5 }),
      queryFn: () => activityRepository.fetch({ days: 7, limit: 5 }),
      staleTime,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.suppliers.overview(),
      queryFn: () => suppliersRepository.overview(),
      staleTime,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.approvals.list(),
      queryFn: () => approvalsRepository.list(),
      staleTime,
    });
    return;
  }

  if (path === moduleLinks.workstream) {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard(),
      queryFn: () => dashboardRepository.fetch(),
      staleTime,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.approvals.list(),
      queryFn: () => approvalsRepository.list(),
      staleTime,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.emails.all(),
      queryFn: () => emailsRepository.list(),
      staleTime,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.autonomous(),
      queryFn: () => autonomousRepository.list(),
      staleTime,
    });
    return;
  }

  if (path === moduleLinks.approvals) {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.approvals.list(),
      queryFn: () => approvalsRepository.list(),
      staleTime,
    });
    return;
  }

  if (path === moduleLinks.insights) {
    const days = 30;
    void queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard(),
      queryFn: () => dashboardRepository.fetch(),
      staleTime,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.outcomes(days),
      queryFn: () => insightsRepository.outcomeReport(days),
      staleTime: queryTiming.insightsStale,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.autonomyMetrics(days),
      queryFn: () => insightsRepository.autonomyMetrics(days),
      staleTime: queryTiming.insightsStale,
    });
    return;
  }

  if (path === moduleLinks.activity) {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.activity({ days: 30, limit: 100 }),
      queryFn: () => activityRepository.fetch({ days: 30, limit: 100 }),
      staleTime: queryTiming.activityStale,
    });
    return;
  }

  if (path === '/overview') {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard(),
      queryFn: () => dashboardRepository.fetch(),
      staleTime,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.approvals.list(),
      queryFn: () => approvalsRepository.list(),
      staleTime,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.aetherOverviewInfinite({ days: 7 }),
      queryFn: () => overviewApi.fetchPage({ days: 7, limit: 25 }),
      staleTime: queryTiming.activityStale,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.agentMetrics(7),
      queryFn: () =>
        import('@/lib/api').then(({ apiFetch, apiRoutes }) =>
          apiFetch(apiRoutes.admin.agentMetrics(7)),
        ),
      staleTime,
    });
    return;
  }

  if (path === moduleLinks.suppliers) {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.suppliers.overview(),
      queryFn: () => suppliersRepository.overview(),
      staleTime,
    });
    return;
  }

  if (path === moduleLinks.settings) {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.settings(),
      queryFn: () => settingsRepository.fetch(),
      staleTime: queryTiming.settingsStale,
    });
  }
}
