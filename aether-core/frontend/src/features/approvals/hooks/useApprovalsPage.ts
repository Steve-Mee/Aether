import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { activityApi } from '@/features/activity/api';
import { useDashboard } from '@/lib/DashboardContext';
import { approvalsApi } from '@/features/approvals/api';
import {
  mapActivityToRecentApprovals,
  mergeRecentApprovals,
} from '@/features/approvals/lib/approvalActivityRecent';
import { useApprovalMutations } from '@/features/approvals/hooks/useApprovalMutations';
import { useAppShellStore } from '@/lib/stores/appShellStore';
import { useAetherQuery } from '@/lib/query/hooks';
import {
  enrichApproval,
  matchesDateFilter,
  matchesSearch,
  matchesTab,
  sortEnrichedApprovals,
} from '@/lib/approvalPresentation';
import { t } from '@/lib/i18n';
import { showErrorToast } from '@/lib/toast';
import { queryKeys } from '@/lib/query/keys';
import { queryTiming } from '@/lib/query/client';
import { toUserMessage } from '@/lib/api/errors';
import { trackBusinessEvent } from '@/lib/observability/businessEvents';
import { withBusinessSpan } from '@/lib/observability/performanceSpans';
import type {
  ApprovalDateFilter,
  ApprovalItem,
  ApprovalTab,
  HandledOutcome,
  RecentlyHandledApproval,
} from '@/types/approval';

export function useApprovalsPage() {
  const [searchParams] = useSearchParams();
  const focusedApprovalId = searchParams.get('id');
  const focusScrollDone = useRef<string | null>(null);

  const { data: dashboard } = useDashboard();
  const [activeTab, setActiveTab] = useState<ApprovalTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<ApprovalDateFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sessionHandled, setSessionHandled] = useState<RecentlyHandledApproval[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const setPendingApprovalsCount = useAppShellStore((s) => s.setPendingApprovalsCount);

  const {
    resolveMutation,
    autoApplyMutation,
    afterApprovalSuccess,
    isPending: bulkLoading,
  } = useApprovalMutations({
    onResolveSettled: () => setResolvingId(null),
    showSuccessFeedback: false,
  });

  const {
    data: approvals,
    error,
    isLoading: loading,
    refetch,
  } = useAetherQuery(queryKeys.approvals.list(), () => approvalsApi.list());

  const { data: activityFeed } = useAetherQuery(
    queryKeys.activity({ days: 7, limit: 50 }),
    () => activityApi.fetch({ days: 7, limit: 50 }),
    {
      staleTime: queryTiming.activityStale,
      gcTime: queryTiming.activityGc,
      meta: { domain: 'activity' },
    },
  );

  const activityRecent = useMemo(
    () => mapActivityToRecentApprovals(activityFeed?.items ?? []),
    [activityFeed],
  );

  const recentlyHandled = useMemo(
    () => mergeRecentApprovals(sessionHandled, activityRecent),
    [sessionHandled, activityRecent],
  );

  useEffect(() => {
    const pending =
      approvals?.filter((a) => a.status === 'pending').length ?? approvals?.length ?? 0;
    setPendingApprovalsCount(pending);
  }, [approvals, setPendingApprovalsCount]);

  useEffect(() => {
    if (!focusedApprovalId || !approvals?.length) return;
    const target = approvals.find((a) => a.id === focusedApprovalId);
    if (!target) return;
    setActiveTab('all');
    setSearchQuery('');
    setDateFilter('all');
  }, [focusedApprovalId, approvals]);

  const reload = useCallback(() => {
    void refetch();
  }, [refetch]);

  const errorMessage = error ? toUserMessage(error) : null;

  const enriched = useMemo(() => {
    if (!approvals) return [];
    return sortEnrichedApprovals(approvals.map(enrichApproval));
  }, [approvals]);

  const filteredPending = useMemo(() => {
    if (activeTab === 'recent') return [];
    return enriched.filter(
      (e) =>
        matchesTab(e, activeTab) &&
        matchesSearch(e, searchQuery) &&
        matchesDateFilter(e.item.createdAt, dateFilter),
    );
  }, [enriched, activeTab, searchQuery, dateFilter]);

  const highRiskItems = useMemo(
    () => filteredPending.filter((e) => e.riskBand === 'high'),
    [filteredPending],
  );

  const otherItems = useMemo(
    () => filteredPending.filter((e) => e.riskBand !== 'high'),
    [filteredPending],
  );

  const lowRiskItems = useMemo(() => enriched.filter((e) => e.riskBand === 'low'), [enriched]);

  const showGroupedSections =
    activeTab === 'all' && highRiskItems.length > 0 && otherItems.length > 0;

  useEffect(() => {
    if (!focusedApprovalId || loading) return;
    if (focusScrollDone.current === focusedApprovalId) return;
    const el = document.querySelector(`[data-testid="approval-card-${focusedApprovalId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      focusScrollDone.current = focusedApprovalId;
    }
  }, [focusedApprovalId, loading, filteredPending]);

  const afterMutation = useCallback(
    async (message: string) => {
      setSuccessMessage(message);
      await afterApprovalSuccess(message);
      window.setTimeout(() => setSuccessMessage(null), 5000);
    },
    [afterApprovalSuccess],
  );

  const clearSuccessMessage = useCallback(() => setSuccessMessage(null), []);

  const pushHandled = useCallback((item: ApprovalItem, outcome: HandledOutcome) => {
    setSessionHandled((prev) => [
      { item, outcome, handledAt: new Date().toISOString() },
      ...prev.filter((h) => h.item.id !== item.id),
    ]);
  }, []);

  const resolveOne = useCallback(
    async (id: string, approve: boolean) => {
      const item = approvals?.find((a) => a.id === id);
      setResolvingId(id);
      try {
        await resolveMutation.mutateAsync({ id, approve });
        if (item) pushHandled(item, approve ? 'approved' : 'rejected');
        const msg = approve ? t('approvals.success.approved') : t('approvals.success.rejected');
        await afterMutation(msg);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } catch {
        /* handled in mutation onError */
      }
    },
    [approvals, pushHandled, afterMutation, resolveMutation],
  );

  const resolveMany = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      await withBusinessSpan('approval.bulk_resolve', { total: ids.length }, async () => {
        let ok = 0;
        let fail = 0;
        for (const id of ids) {
          try {
            await resolveMutation.mutateAsync({ id, approve: true });
            const item = approvals?.find((a) => a.id === id);
            if (item) pushHandled(item, 'approved');
            ok++;
          } catch {
            fail++;
          }
        }
        trackBusinessEvent('approval.bulk_resolved', { ok, fail, total: ids.length });
        if (fail > 0) {
          showErrorToast(
            t('approvals.error.bulkPartial')
              .replace('{ok}', String(ok))
              .replace('{fail}', String(fail)),
          );
        }
        const msg =
          fail > 0
            ? t('approvals.success.bulkPartial')
                .replace('{ok}', String(ok))
                .replace('{fail}', String(fail))
            : t('approvals.success.bulk').replace('{count}', String(ok));
        if (ok > 0) await afterMutation(msg);
        setSelectedIds(new Set());
      });
    },
    [approvals, pushHandled, afterMutation, resolveMutation],
  );

  const runAutoApply = useCallback(async () => {
    try {
      const res = await autoApplyMutation.mutateAsync(undefined);
      const msg = t('approvals.success.autoApply')
        .replace('{applied}', String(res.applied))
        .replace('{skipped}', String(res.skipped));
      setSuccessMessage(msg);
      await afterMutation(msg);
      setSelectedIds(new Set());
    } catch {
      /* onError handles toast */
    }
  }, [afterMutation, autoApplyMutation]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllLowRisk = useCallback(() => {
    setSelectedIds(new Set(lowRiskItems.map((e) => e.item.id)));
  }, [lowRiskItems]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setDateFilter('all');
  }, []);

  const recentEnriched = useMemo(
    () =>
      recentlyHandled.map((h) => ({
        ...enrichApproval(h.item),
        handledAt: h.handledAt,
        outcome: h.outcome,
      })),
    [recentlyHandled],
  );

  const pendingCount = useMemo(
    () => approvals?.filter((a) => a.status === 'pending').length ?? 0,
    [approvals],
  );

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    dateFilter,
    setDateFilter,
    selectedIds,
    toggleSelect,
    selectAllLowRisk,
    clearSelection,
    clearFilters,
    filteredPending,
    highRiskItems,
    otherItems,
    lowRiskItems,
    showGroupedSections,
    recentEnriched,
    successMessage,
    clearSuccessMessage,
    resolvingId,
    bulkLoading,
    loading,
    error: errorMessage,
    reload,
    resolveOne,
    resolveMany,
    runAutoApply,
    pendingCount,
    dashboard,
    enriched,
    focusedApprovalId,
  };
}
