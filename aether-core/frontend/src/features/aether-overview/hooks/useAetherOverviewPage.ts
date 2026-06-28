import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { activityApi } from '@/features/activity/api';
import { approvalsApi } from '@/features/approvals/api';
import { useApprovalMutations } from '@/features/approvals/hooks/useApprovalMutations';
import { overviewApi } from '@/features/aether-overview/api/overviewApi';
import { useGoals } from '@/hooks/useGoals';
import { useProactiveSuggestions } from '@/hooks/useProactiveSuggestions';
import { useDashboard } from '@/lib/DashboardContext';
import { apiFetch, apiRoutes } from '@/lib/api';
import { groupByDate } from '@/lib/activityPresentation';
import { env } from '@/lib/config/env';
import { agentDisplayLabel } from '@/lib/agentDisplay';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import { AUTONOMY_AGENT_KEYS } from '@/lib/settings/autonomyTypes';
import { aetherErrorMessage, useAetherQuery } from '@/lib/query/hooks';
import { queryTiming } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';
import type {
  AgentMetricsResponse,
  AgentPerformanceDto,
  AgentRosterEntry,
  AgentsRosterResponse,
} from '@/types/agents';
import type { ActivityItem } from '@/types/activity';
import {
  DEFAULT_OVERVIEW_FILTERS,
  OVERVIEW_ACTIVITY_LIMITS,
  type OverviewFilters,
  type OverviewHighlightKind,
  type OverviewSectionKey,
} from '../types';
import {
  filterOverviewActivityItems,
  filterOverviewProactiveSuggestions,
  periodToDays,
  showActivityFeed,
  showGoalsSection,
  showProactiveSection,
} from '../lib/overviewFilters';
import {
  buildOverviewKpis,
  hasAttentionItems,
  selectActiveGoals,
  selectPendingApprovals,
} from '../lib/overviewPresentation';
import {
  feedQueryParams,
  filtersToSearchParams,
  parseOverviewHighlight,
  searchParamsToFilters,
} from '../lib/overviewUrlSync';
import { activityFromOverviewItem } from '../types/overviewFeed';
import { useOverviewStream } from './useOverviewStream';

function demoRoster(): AgentRosterEntry[] {
  return AUTONOMY_AGENT_KEYS.map((key) => ({
    agentKey: key,
    displayName: agentDisplayLabel(key),
    description: `${agentDisplayLabel(key)} — demo modus`,
    supportedIntents: [],
    canDelegateTo: [],
    status: 'idle' as const,
    proactiveCount: key === 'inventory' ? 1 : 0,
    recentActionCount: 0,
  }));
}

function demoAgentMetrics(): AgentPerformanceDto[] {
  return AUTONOMY_AGENT_KEYS.slice(0, 4).map((key) => ({
    agentKey: key,
    successRate: 0.75 + Math.random() * 0.2,
    recentFailures: key === 'pricing' ? 1 : 0,
    sampleSize: 12,
    displayName: agentDisplayLabel(key),
  }));
}

export function useAetherOverviewPage() {
  const { data: dashboard } = useDashboard();
  const { settings, updateSettings } = useMerchantSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const overviewPrefs = settings.overviewPrefs ?? {
    enabled: true,
    sectionOrder: [
      'attention',
      'agentMetrics',
      'handoffs',
      'proactive',
      'goals',
      'activity',
    ] as OverviewSectionKey[],
    collapsed: {},
    sections: {
      attention: true,
      agentMetrics: true,
      handoffs: true,
      proactive: true,
      goals: true,
      activity: true,
    },
    defaultPeriod: '7d' as const,
  };

  const defaultFilters = useMemo(
    () => ({
      ...DEFAULT_OVERVIEW_FILTERS,
      period: overviewPrefs.defaultPeriod ?? DEFAULT_OVERVIEW_FILTERS.period,
    }),
    [overviewPrefs.defaultPeriod],
  );

  const [filters, setFilters] = useState<OverviewFilters>(() =>
    searchParamsToFilters(searchParams, defaultFilters),
  );
  const [activityLimitIndex, setActivityLimitIndex] = useState(0);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [resolvingApprovalId, setResolvingApprovalId] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<{ kind: OverviewHighlightKind; id: string } | null>(
    () => parseOverviewHighlight(searchParams.get('highlight')),
  );
  const highlightApplied = useRef(false);

  useOverviewStream(env.isLiveMode);

  const feedParams = useMemo(() => feedQueryParams(filters), [filters]);
  const activityLimit = OVERVIEW_ACTIVITY_LIMITS[activityLimitIndex] ?? 50;
  const days = periodToDays(filters.period);
  const agentKey = filters.agentKey !== 'all' ? filters.agentKey : undefined;

  const infiniteQuery = useInfiniteQuery({
    queryKey: queryKeys.aetherOverviewInfinite(feedParams),
    queryFn: ({ pageParam }) =>
      overviewApi.fetchPage({
        ...feedParams,
        limit: 25,
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: env.isLiveMode,
    staleTime: queryTiming.activityStale,
    refetchOnWindowFocus: true,
  });

  const handoffsQuery = useAetherQuery(
    queryKeys.aetherOverviewHandoffs(days),
    () => overviewApi.fetchHandoffs(days, 15),
    {
      enabled: env.isLiveMode && overviewPrefs.sections?.handoffs !== false,
      staleTime: queryTiming.activityStale,
      refetchOnWindowFocus: true,
    },
  );

  const activityQuery = useAetherQuery(
    queryKeys.aetherOverview({ days, limit: activityLimit, agentKey }),
    () => activityApi.fetch({ days, limit: activityLimit, agentKey }),
    {
      enabled: !env.isLiveMode,
      staleTime: queryTiming.activityStale,
      gcTime: queryTiming.activityGc,
      placeholderData: keepPreviousData,
      refetchOnWindowFocus: true,
      meta: { domain: 'activity' },
    },
  );

  const approvalsQuery = useAetherQuery(queryKeys.approvals.list(), () => approvalsApi.list(), {
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const rosterQuery = useAetherQuery(
    queryKeys.agents(),
    () => apiFetch<AgentsRosterResponse>(apiRoutes.admin.agents),
    { enabled: env.isLiveMode, staleTime: 30_000 },
  );

  const metricsQuery = useAetherQuery(
    queryKeys.agentMetrics(days),
    () => apiFetch<AgentMetricsResponse>(apiRoutes.admin.agentMetrics(days)),
    { enabled: env.isLiveMode, staleTime: 60_000 },
  );

  const goalsQuery = useGoals(false);
  const proactive = useProactiveSuggestions();

  const { resolveMutation, afterApprovalSuccess } = useApprovalMutations({
    onResolveSettled: () => setResolvingApprovalId(null),
    showSuccessFeedback: true,
  });

  const agents = useMemo(
    () => (env.isLiveMode ? (rosterQuery.data?.agents ?? []) : demoRoster()),
    [rosterQuery.data?.agents],
  );

  const agentMetrics = useMemo(
    () => (env.isLiveMode ? (metricsQuery.data?.agents ?? []) : demoAgentMetrics()),
    [metricsQuery.data?.agents],
  );

  const unifiedItems = useMemo(
    () => infiniteQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [infiniteQuery.data?.pages],
  );

  const feedMeta = infiniteQuery.data?.pages[0]?.meta;

  const activityItems = env.isLiveMode
    ? unifiedItems
        .filter((i) => i.kind === 'activity')
        .map((i) => activityFromOverviewItem(i))
        .filter((i): i is ActivityItem => i != null)
    : (activityQuery.data?.items ?? []);

  const approvals = approvalsQuery.data ?? [];

  const filteredActivity = useMemo(
    () => (env.isLiveMode ? activityItems : filterOverviewActivityItems(activityItems, filters)),
    [activityItems, filters],
  );

  const filteredProactive = useMemo(
    () => filterOverviewProactiveSuggestions(proactive.suggestions, filters),
    [proactive.suggestions, filters],
  );

  const activityGroups = useMemo(() => groupByDate(filteredActivity), [filteredActivity]);

  const selectedActivity = useMemo(
    () => filteredActivity.find((i) => i.id === selectedActivityId) ?? null,
    [filteredActivity, selectedActivityId],
  );

  const kpis = useMemo(() => buildOverviewKpis(dashboard), [dashboard]);

  const pendingApprovals = useMemo(() => selectPendingApprovals(approvals, 3), [approvals]);

  const pendingCount =
    feedMeta?.pendingApprovals ?? approvals.filter((a) => a.status === 'pending').length;

  const activeGoals = useMemo(() => selectActiveGoals(goalsQuery.data ?? [], 3), [goalsQuery.data]);

  const syncUrl = useCallback(
    (nextFilters: OverviewFilters, nextHighlight: typeof highlight) => {
      const params = new URLSearchParams(filtersToSearchParams(nextFilters));
      if (nextHighlight) {
        params.set('highlight', `${nextHighlight.kind}:${nextHighlight.id}`);
      }
      setSearchParams(params, { replace: true });
    },
    [setSearchParams],
  );

  const updateFilter = useCallback(
    <K extends keyof OverviewFilters>(key: K, value: OverviewFilters[K]) => {
      setFilters((f) => {
        const next = { ...f, [key]: value };
        syncUrl(next, highlight);
        return next;
      });
      if (key !== 'searchQuery') {
        setActivityLimitIndex(0);
      }
    },
    [highlight, syncUrl],
  );

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
    syncUrl(defaultFilters, highlight);
    setActivityLimitIndex(0);
  }, [defaultFilters, highlight, syncUrl]);

  const loadMore = useCallback(() => {
    if (env.isLiveMode) {
      void infiniteQuery.fetchNextPage();
      return;
    }
    setActivityLimitIndex((i) => (i < OVERVIEW_ACTIVITY_LIMITS.length - 1 ? i + 1 : i));
  }, [infiniteQuery]);

  const canLoadMore = env.isLiveMode
    ? Boolean(infiniteQuery.hasNextPage)
    : activityLimitIndex < OVERVIEW_ACTIVITY_LIMITS.length - 1 &&
      activityItems.length >= activityLimit;

  const approve = useCallback(
    (id: string) => {
      setResolvingApprovalId(id);
      resolveMutation.mutate(
        { id, approve: true },
        { onSuccess: () => void afterApprovalSuccess('') },
      );
    },
    [afterApprovalSuccess, resolveMutation],
  );

  const reject = useCallback(
    (id: string) => {
      setResolvingApprovalId(id);
      resolveMutation.mutate(
        { id, approve: false },
        { onSuccess: () => void afterApprovalSuccess('') },
      );
    },
    [afterApprovalSuccess, resolveMutation],
  );

  const reload = useCallback(() => {
    if (env.isLiveMode) void infiniteQuery.refetch();
    else void activityQuery.refetch();
    void approvalsQuery.refetch();
    void goalsQuery.refetch();
    proactive.refresh();
    if (env.isLiveMode) {
      void rosterQuery.refetch();
      void metricsQuery.refetch();
      void handoffsQuery.refetch();
    }
  }, [
    activityQuery,
    approvalsQuery,
    goalsQuery,
    handoffsQuery,
    infiniteQuery,
    metricsQuery,
    proactive,
    rosterQuery,
  ]);

  useEffect(() => {
    if (highlightApplied.current || !highlight) return;
    highlightApplied.current = true;
    if (highlight.kind === 'activity') {
      setSelectedActivityId(highlight.id);
    }
    const el = document.querySelector(
      `[data-testid*="${highlight.id}"], [data-highlighted="true"]`,
    );
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = setTimeout(() => setHighlight(null), 3000);
    return () => clearTimeout(timer);
  }, [highlight]);

  const toggleSectionCollapsed = useCallback(
    (key: OverviewSectionKey) => {
      const collapsed = overviewPrefs.collapsed ?? {};
      void updateSettings({
        overviewPrefs: {
          ...overviewPrefs,
          collapsed: { ...collapsed, [key]: !collapsed[key] },
        },
      });
    },
    [overviewPrefs, updateSettings],
  );

  const isSectionVisible = useCallback(
    (key: OverviewSectionKey): boolean => {
      if (!overviewPrefs.sections?.[key]) return false;
      if (key === 'goals' && !settings.goalPrefs.enabled) return false;
      if (key === 'proactive' && !settings.proactivePrefs.enabled) return false;
      if (key === 'handoffs' && settings.explainabilityPrefs?.detailLevel === 'off') return false;
      if (key === 'attention' && pendingCount === 0) return false;
      return true;
    },
    [
      overviewPrefs.sections,
      pendingCount,
      settings.goalPrefs.enabled,
      settings.proactivePrefs.enabled,
      settings.explainabilityPrefs?.detailLevel,
    ],
  );

  const loading =
    (env.isLiveMode ? infiniteQuery.isLoading : activityQuery.isLoading) ||
    approvalsQuery.isLoading ||
    goalsQuery.isLoading ||
    proactive.loading;

  const error =
    aetherErrorMessage(env.isLiveMode ? infiniteQuery.error : activityQuery.error) ??
    aetherErrorMessage(approvalsQuery.error) ??
    null;

  return {
    filters,
    updateFilter,
    clearFilters,
    kpis,
    agents,
    agentMetrics,
    pendingApprovals,
    pendingCount,
    showAttention: hasAttentionItems(pendingCount),
    proactive: {
      items: filteredProactive.slice(0, 4),
      dismiss: proactive.dismiss,
      snooze: proactive.snooze,
      execute: proactive.execute,
      executingId: proactive.executingId,
      streaming: proactive.streaming,
    },
    proactiveAllowAutoExecute: settings.proactivePrefs.allowAutoExecute,
    goals: activeGoals,
    activityGroups,
    unifiedItems,
    filteredActivityCount: env.isLiveMode ? unifiedItems.length : filteredActivity.length,
    selectedActivity,
    selectedActivityId,
    setSelectedActivityId,
    showProactiveSection: showProactiveSection(filters),
    showGoalsSection: showGoalsSection(filters),
    showActivityFeed: showActivityFeed(filters),
    showUnifiedFeed: env.isLiveMode,
    loadMore,
    canLoadMore,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    approve,
    reject,
    resolvingApprovalId,
    loading,
    error,
    reload,
    feedSource: env.isLiveMode ? 'live' : (activityQuery.data?.source ?? 'partial'),
    highlightId: highlight?.id ?? null,
    highlight,
    overviewPrefs,
    sectionOrder: overviewPrefs.sectionOrder,
    handoffs: handoffsQuery.data?.items ?? [],
    isSectionVisible,
    isSectionCollapsed: (key: OverviewSectionKey) => Boolean(overviewPrefs.collapsed?.[key]),
    toggleSectionCollapsed,
  };
}
