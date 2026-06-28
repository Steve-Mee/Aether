import { useCallback, useEffect, useMemo, useState } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { activityApi } from '@/features/activity/api';
import { useCommand } from '@/lib/CommandContext';
import { useAetherQuery } from '@/lib/query/hooks';
import {
  mergeActivityFeed,
  periodToApiDays,
  pruneEphemeralAgainstLive,
} from '@/lib/mergeActivityFeed';
import { filterActivityItems, groupByDate, countByStatus } from '@/lib/activityPresentation';
import { periodToDays } from '@/lib/activityPageDemo';
import { aetherErrorMessage } from '@/lib/query/hooks';
import { queryTiming } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';
import type {
  ActivityCustomRange,
  ActivityFilters,
  ActivityItem,
  ActivityPeriod,
} from '@/types/activity';
import type { CommandResult } from '@/types/command';
import { subscribeActivityItem } from '@/lib/aetherLiveBus';

const defaultFilters: ActivityFilters = {
  category: 'all',
  risk: 'all',
  executor: 'all',
  status: 'all',
  searchQuery: '',
  agentKey: 'all',
};

function sessionToActivityItems(history: CommandResult[]): ActivityItem[] {
  return history.map((h, idx) => ({
    id: `session-${h.timestamp ?? idx}`,
    source: 'demo' as const,
    at: h.timestamp ?? new Date().toISOString(),
    actionType: 'command_executed',
    actionLabel: 'NL-commando (sessie)',
    description: h.originalCommand ?? h.parsedIntent ?? h.result,
    module: 'admin-command-bar',
    category: 'command',
    risk: (h.confidence ?? 0) >= 0.85 ? 'low' : (h.confidence ?? 0) < 0.7 ? 'high' : 'low',
    status: 'info',
    executor: 'merchant',
    confidence: h.confidence,
    rationale: h.result,
    searchText: `${h.originalCommand ?? ''} ${h.result}`.toLowerCase(),
  }));
}

type ActivityLocationState = {
  presetCategory?: ActivityFilters['category'];
  selectedId?: string;
};

export function useActivityPage() {
  const { history } = useCommand();
  const location = useLocation();
  const [period, setPeriod] = useState<ActivityPeriod>('30d');
  const [customRange, setCustomRange] = useState<ActivityCustomRange>({ from: '', to: '' });
  const [filters, setFilters] = useState<ActivityFilters>(defaultFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ephemeralItems, setEphemeralItems] = useState<ActivityItem[]>([]);

  const activityParams = useMemo(() => {
    const agentKey = filters.agentKey !== 'all' ? filters.agentKey : undefined;
    if (period === 'custom' && customRange.from) {
      return { since: new Date(customRange.from).toISOString(), limit: 100, agentKey };
    }
    return { days: periodToApiDays(period), limit: 100, agentKey };
  }, [period, customRange.from, filters.agentKey]);

  const activityQuery = useAetherQuery(
    queryKeys.activity(activityParams),
    () => {
      const limit = 100;
      const agentKey = filters.agentKey !== 'all' ? filters.agentKey : undefined;
      if (period === 'custom' && customRange.from) {
        return activityApi.fetch({
          since: new Date(customRange.from).toISOString(),
          limit,
          agentKey,
        });
      }
      return activityApi.fetch({ days: periodToApiDays(period), limit, agentKey });
    },
    {
      enabled: period !== 'custom' || Boolean(customRange.from),
      staleTime: queryTiming.activityStale,
      gcTime: queryTiming.activityGc,
      placeholderData: keepPreviousData,
    },
  );

  const liveFeed = activityQuery.data ?? null;
  const loading = activityQuery.isLoading;
  const error = aetherErrorMessage(activityQuery.error);

  const reload = useCallback(() => {
    void activityQuery.refetch();
  }, [activityQuery]);

  useEffect(() => {
    const state = location.state as ActivityLocationState | null;
    if (state?.presetCategory) {
      setFilters((f) => ({ ...f, category: state.presetCategory! }));
    }
    if (state?.selectedId) {
      setSelectedId(state.selectedId);
    }
  }, [location.state]);

  useEffect(() => {
    const id = new URLSearchParams(location.search).get('id');
    if (id) setSelectedId(id);
    const agent = new URLSearchParams(location.search).get('agent');
    if (agent) {
      setFilters((f) => ({ ...f, agentKey: agent }));
    }
  }, [location.search]);

  useEffect(() => {
    return subscribeActivityItem((item) => {
      setEphemeralItems((prev) => {
        if (prev.some((p) => p.id === item.id)) return prev;
        return [item, ...prev].slice(0, 20);
      });
    });
  }, []);

  useEffect(() => {
    if (!liveFeed) return;
    setEphemeralItems((prev) => pruneEphemeralAgainstLive(prev, liveFeed));
  }, [liveFeed]);

  const merged = useMemo(
    () =>
      mergeActivityFeed({
        period,
        customRange: period === 'custom' ? customRange : undefined,
        live: liveFeed,
        sessionItems: sessionToActivityItems(history as CommandResult[]),
        ephemeralItems,
      }),
    [period, customRange, liveFeed, history, ephemeralItems],
  );

  const filtered = useMemo(
    () =>
      filterActivityItems(
        merged.items,
        period,
        filters,
        period === 'custom' ? customRange : undefined,
      ),
    [merged.items, period, filters, customRange],
  );

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  const selected = useMemo(
    () => filtered.find((i) => i.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  const stats = useMemo(() => {
    const periodItems = filterActivityItems(
      merged.items,
      period === 'custom' && customRange.from ? 'custom' : period,
      { ...defaultFilters, searchQuery: '' },
      period === 'custom' ? customRange : undefined,
    );
    return countByStatus(periodItems);
  }, [merged.items, period, customRange]);

  const updateFilter = useCallback(
    <K extends keyof ActivityFilters>(key: K, value: ActivityFilters[K]) => {
      setFilters((f) => ({ ...f, [key]: value }));
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  return {
    period,
    setPeriod,
    customRange,
    setCustomRange,
    filters,
    updateFilter,
    clearFilters,
    groups,
    filtered,
    merged,
    stats,
    loading,
    error,
    reload,
    selected,
    selectedId,
    setSelectedId,
    periodDays: periodToDays(period),
  };
}
