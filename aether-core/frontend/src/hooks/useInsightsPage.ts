import { useMemo, useState } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { insightsApi } from '@/features/insights/api';
import { env } from '@/lib/config';
import { useDashboard } from '@/lib/DashboardContext';
import {
  emptyInsightsDemoSnapshot,
  periodToDays,
  type InsightsDemoSnapshot,
  type InsightsPeriod,
} from '@/lib/insightsPageTypes';
import { mergeInsightsViewModel } from '@/lib/mergeInsightsViewModel';
import { useAppShellStore } from '@/lib/stores/appShellStore';
import type { InsightsViewModel } from '@/types/insight';
import { aetherErrorMessage, useAetherQuery } from '@/lib/query/hooks';
import { queryClient, queryTiming } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';
import { t } from '@/lib/i18n';

async function loadInsightsDemoSnapshot(period: InsightsPeriod) {
  const { getInsightsDemoSnapshot } = await import('@/lib/insightsPageDemo.data');
  return getInsightsDemoSnapshot(period);
}

export function useInsightsPage() {
  const { data: dashboard } = useDashboard();
  const lastCommandAt = useAppShellStore((s) => s.lastCommandAt);
  const [period, setPeriod] = useState<InsightsPeriod>('30d');
  const days = periodToDays(period);
  const enabled = period !== 'custom';
  const useHybridDemo = env.hybridDemo;

  const outcomesQuery = useAetherQuery(
    queryKeys.outcomes(days),
    () => insightsApi.outcomeReport(days),
    {
      enabled,
      staleTime: queryTiming.insightsStale,
      gcTime: queryTiming.insightsGc,
      placeholderData: keepPreviousData,
      meta: { domain: 'insights' },
    },
  );

  const autonomyQuery = useAetherQuery(
    queryKeys.autonomyMetrics(days),
    () => insightsApi.autonomyMetrics(days),
    {
      enabled,
      staleTime: queryTiming.insightsStale,
      gcTime: queryTiming.insightsGc,
      placeholderData: keepPreviousData,
      meta: { domain: 'insights' },
    },
  );

  const demoQuery = useAetherQuery(
    ['insights-demo-snapshot', period],
    () => loadInsightsDemoSnapshot(period),
    {
      enabled: useHybridDemo,
      staleTime: Infinity,
      gcTime: queryTiming.insightsGc,
      meta: { domain: 'insights' },
    },
  );

  const outcomes = outcomesQuery.data ?? null;
  const autonomy = autonomyQuery.data ?? null;
  const refreshing = outcomesQuery.isFetching || autonomyQuery.isFetching;
  const initialLoading =
    outcomesQuery.isLoading || autonomyQuery.isLoading || (useHybridDemo && demoQuery.isLoading);
  const error = outcomesQuery.error ?? autonomyQuery.error ?? demoQuery.error;
  const errorMessage = error ? (aetherErrorMessage(error) ?? t('insights.error')) : '';

  const demoSnapshot: InsightsDemoSnapshot = useMemo(() => {
    if (useHybridDemo) {
      return demoQuery.data ?? emptyInsightsDemoSnapshot(period);
    }
    return emptyInsightsDemoSnapshot(period);
  }, [useHybridDemo, demoQuery.data, period]);

  const viewModel: InsightsViewModel | null = useMemo(() => {
    if (useHybridDemo && !demoQuery.data) return null;
    return mergeInsightsViewModel({
      period,
      dashboard,
      outcomes,
      autonomy,
      lastCommandAt,
      demo: demoSnapshot,
    });
  }, [
    period,
    dashboard,
    outcomes,
    autonomy,
    lastCommandAt,
    demoSnapshot,
    useHybridDemo,
    demoQuery.data,
  ]);

  const reload = () => {
    void outcomesQuery.refetch();
    void autonomyQuery.refetch();
    if (useHybridDemo) {
      void queryClient.invalidateQueries({ queryKey: ['insights-demo-snapshot', period] });
    }
  };

  return {
    period,
    setPeriod,
    viewModel,
    refreshing,
    initialLoading,
    error: errorMessage,
    reload,
  };
}
