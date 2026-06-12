import { useEffect, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { homeLandingApi } from '@/features/command-center/api';
import { useDashboard } from '@/lib/DashboardContext';
import { useAppShellStore } from '@/lib/stores/appShellStore';
import {
  buildHomeLandingViewModel,
  countHighRiskPendingApprovals,
} from '@/lib/buildHomeLandingViewModel';
import { mergeActivityFeed } from '@/lib/mergeActivityFeed';
import { showErrorToast } from '@/lib/toast';
import { t } from '@/lib/i18n';
import { queryKeys } from '@/lib/query/keys';
import { aetherErrorMessage } from '@/lib/query/hooks';
import type { ActivityItem } from '@/types/activity';

export function useHomeLanding() {
  const { data: dashboard } = useDashboard();
  const setPendingApprovalsCount = useAppShellStore((s) => s.setPendingApprovalsCount);

  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.activity({ days: 7, limit: 5 }),
        queryFn: () => homeLandingApi.activity(7),
      },
      {
        queryKey: queryKeys.suppliers.overview(),
        queryFn: () => homeLandingApi.suppliersOverview(),
      },
      {
        queryKey: queryKeys.approvals.list(),
        queryFn: () => homeLandingApi.approvals(),
      },
    ],
  });

  const activity = results[0].data ?? null;
  const supplierOverview = results[1].data ?? null;
  const approvals = results[2].data ?? null;
  const loading = results.some((r) => r.isLoading);
  const error = results.find((r) => r.error)?.error ?? null;

  useEffect(() => {
    if (aetherErrorMessage(error)) {
      showErrorToast(t('home.error.load'));
    }
  }, [error]);

  const highRiskPendingCount = useMemo(() => countHighRiskPendingApprovals(approvals), [approvals]);

  useEffect(() => {
    const pending =
      approvals?.filter((a) => a.status === 'pending').length ?? approvals?.length ?? 0;
    setPendingApprovalsCount(pending);
  }, [approvals, setPendingApprovalsCount]);

  const viewModel = useMemo(
    () =>
      buildHomeLandingViewModel({
        dashboard,
        supplierOverview,
        highRiskPendingCount,
      }),
    [dashboard, supplierOverview, highRiskPendingCount],
  );

  const { activityItems, activitySource } = useMemo(() => {
    const merged = mergeActivityFeed({ period: '7d', live: activity });
    return {
      activityItems: merged.items.slice(0, 5) as ActivityItem[],
      activitySource: merged.source,
    };
  }, [activity]);

  const reload = () => {
    void results.forEach((r) => r.refetch());
  };

  return {
    viewModel,
    activityItems,
    activitySource,
    highRiskPendingCount,
    loading,
    error: aetherErrorMessage(error),
    reload,
    tenantDisplayName: dashboard?.tenantDisplayName ?? null,
  };
}
