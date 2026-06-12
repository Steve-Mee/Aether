import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAetherMutation } from '@/lib/query/hooks';
import { optimisticPatch, rollbackQueryData, type OptimisticContext } from '@/lib/query/optimistic';
import { subscribeSupplierChange } from '@/lib/aetherLiveBus';
import { suppliersApi } from '@/features/suppliers/api';
import { invalidateAfterSupplierChange } from '@/lib/data/invalidateAfterMutation';
import { afterSupplierSynced } from '@/lib/data/sideEffects';
import { useAetherQuery } from '@/lib/query/hooks';
import { mergeSuppliersViewModel } from '@/lib/mergeSuppliersViewModel';
import { getSupplierDemoDetail, getSuppliersDemoSnapshot } from '@/lib/suppliersPageDemo';
import {
  isDemoSupplierId,
  matchesSearch,
  matchesStatusTab,
  sortSuppliers,
} from '@/lib/suppliersPresentation';
import { t } from '@/lib/i18n';
import { announceStatus } from '@/lib/a11y/announceBus';
import { showCalmToast, showErrorToast } from '@/lib/toast';
import { queryKeys } from '@/lib/query/keys';
import { env } from '@/lib/config/env';
import { toUserMessage } from '@/lib/api/errors';
import { trackBusinessEvent, trackMutationFailure } from '@/lib/observability/businessEvents';
import { withBusinessSpan } from '@/lib/observability/performanceSpans';
import type {
  SupplierDetail,
  SupplierListItem,
  SupplierMonitoringLabel,
  SupplierOverviewApiResponse,
  SupplierStatusTab,
  SuppliersViewModel,
} from '@/types/supplier';

function demoMonitoringLabel(
  status: SupplierListItem['status'],
  autoSyncEnabled: boolean,
): SupplierMonitoringLabel {
  if (status === 'disabled') return 'disabled';
  if (status === 'active' && autoSyncEnabled) return 'sync_on';
  if (status === 'active') return 'active';
  return 'disabled';
}

function applySupplierOverrides(
  suppliers: SupplierListItem[],
  demoOverrides: Record<string, Partial<SupplierListItem>>,
): SupplierListItem[] {
  return suppliers.map((s) => {
    const o = demoOverrides[s.id];
    if (!o) return s;
    const merged = { ...s, ...o };
    if (o.autoSyncEnabled !== undefined) {
      merged.monitoringLabel = demoMonitoringLabel(merged.status, merged.autoSyncEnabled);
    }
    return merged;
  });
}

export function useSuppliersPage() {
  const queryClient = useQueryClient();
  const [demoOverrides, setDemoOverrides] = useState<Record<string, Partial<SupplierListItem>>>({});
  const [statusTab, setStatusTab] = useState<SupplierStatusTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [monitoringId, setMonitoringId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newWebsite, setNewWebsite] = useState('');
  const [highlightedSupplierId, setHighlightedSupplierId] = useState<string | null>(null);
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data: overview,
    error,
    isLoading: loading,
    refetch,
  } = useAetherQuery(queryKeys.suppliers.overview(), () => suppliersApi.overview());

  const { data: pendingChanges } = useAetherQuery(
    queryKeys.suppliers.changes('pending'),
    () => suppliersApi.fetchChanges('pending'),
    { staleTime: 60_000, meta: { domain: 'suppliers' } },
  );

  const effectiveOverrides = useMemo(() => {
    if (env.isMockMode) return demoOverrides;
    return Object.fromEntries(Object.entries(demoOverrides).filter(([id]) => isDemoSupplierId(id)));
  }, [demoOverrides]);

  const reload = useCallback(() => {
    void refetch();
  }, [refetch]);

  const errorMessage = error ? toUserMessage(error) : '';

  const { data: detail, isLoading: detailLoading } = useAetherQuery(
    queryKeys.suppliers.detail(selectedId ?? ''),
    async () => {
      if (!selectedId) return null;
      if (isDemoSupplierId(selectedId)) {
        const d = getSupplierDemoDetail(selectedId);
        const o = demoOverrides[selectedId];
        return d && o?.autoSyncEnabled !== undefined
          ? { ...d, autoSyncEnabled: o.autoSyncEnabled }
          : d;
      }
      const d = await suppliersApi.detail(selectedId);
      return d ?? getSupplierDemoDetail(selectedId);
    },
    { enabled: Boolean(selectedId) },
  );

  useEffect(() => {
    return subscribeSupplierChange((changeDetail) => {
      const isDemo = env.isMockMode || isDemoSupplierId(changeDetail.supplierId);
      if (isDemo) {
        setDemoOverrides((prev) => {
          const existing = prev[changeDetail.supplierId] ?? {};
          const base =
            getSuppliersDemoSnapshot().suppliers.find((s) => s.id === changeDetail.supplierId) ??
            overview?.suppliers?.find((s) => s.id === changeDetail.supplierId);
          const prevCount = existing.recentChangeCount ?? base?.recentChangeCount ?? 0;
          return {
            ...prev,
            [changeDetail.supplierId]: {
              ...existing,
              ...(changeDetail.hasRecentPriceDrop !== undefined && {
                hasRecentPriceDrop: changeDetail.hasRecentPriceDrop,
                hasRecentImportantChange: true,
              }),
              ...(changeDetail.recentChangeCountDelta !== undefined && {
                recentChangeCount: prevCount + changeDetail.recentChangeCountDelta,
              }),
              ...(changeDetail.lastSyncAt && {
                lastSyncAt: changeDetail.lastSyncAt,
                lastAutoSyncAt: changeDetail.lastSyncAt,
              }),
            },
          };
        });
      }
      setHighlightedSupplierId(changeDetail.supplierId);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedSupplierId(null);
        highlightTimerRef.current = null;
      }, 2000);
    });
  }, [overview?.suppliers]);

  const viewModel: SuppliersViewModel = useMemo(() => {
    const base = mergeSuppliersViewModel(overview ?? null);
    return {
      ...base,
      suppliers: applySupplierOverrides(base.suppliers, effectiveOverrides),
    };
  }, [overview, effectiveOverrides]);

  const filteredSuppliers = useMemo(() => {
    const filtered = viewModel.suppliers.filter(
      (s) => matchesSearch(s, searchQuery) && matchesStatusTab(s, statusTab),
    );
    return sortSuppliers(filtered);
  }, [viewModel.suppliers, searchQuery, statusTab]);

  const pendingChangeCount = useMemo(() => {
    if (pendingChanges?.length) return pendingChanges.length;
    return viewModel.suppliers.reduce((n, s) => n + s.recentChangeCount, 0);
  }, [pendingChanges, viewModel.suppliers]);

  const monitorMutation = useAetherMutation<
    Awaited<ReturnType<typeof suppliersApi.monitor>>,
    string,
    OptimisticContext<SupplierOverviewApiResponse>
  >({
    mutationFn: (id: string) =>
      withBusinessSpan('supplier.sync', { supplierId: id }, () => suppliersApi.monitor(id)),
    meta: { domain: 'suppliers', handled: true },
    showToastOnError: false,
    onMutate: async (id) => {
      const previous = queryClient.getQueryData<SupplierOverviewApiResponse>(
        queryKeys.suppliers.overview(),
      );
      if (!previous) return { previous: undefined };
      const now = new Date().toISOString();
      return optimisticPatch<SupplierOverviewApiResponse>(
        queryClient,
        queryKeys.suppliers.overview(),
        (old) => ({
          ...old!,
          suppliers: old!.suppliers.map((s) =>
            s.id === id
              ? {
                  ...s,
                  lastSyncAt: now,
                  lastAutoSyncAt: now,
                  recentChangeCount: s.recentChangeCount + 1,
                  hasRecentImportantChange: true,
                }
              : s,
          ),
        }),
      );
    },
    onError: (err, _id, context) => {
      trackMutationFailure('suppliers', err);
      rollbackQueryData(queryClient, queryKeys.suppliers.overview(), context);
      showErrorToast(t('suppliers.error.sync'));
    },
    onSuccess: (data, id) => {
      trackBusinessEvent('supplier.synced', { supplierId: id, success: true });
      showCalmToast({ variant: 'success', title: t('suppliers.success.sync') });
      invalidateAfterSupplierChange(queryClient);
      const name = data?.supplier?.name ?? overview?.suppliers?.find((s) => s.id === id)?.name;
      afterSupplierSynced(id, {
        supplierName: name,
        recentChangeCountDelta: data?.changes ?? 1,
        lastSyncAt: new Date().toISOString(),
      });
      if (selectedId === id) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.detail(id) });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.changes() });
    },
    onSettled: () => setMonitoringId(null),
  });

  const createMutation = useAetherMutation({
    mutationFn: (payload: { name: string; website: string }) => suppliersApi.create(payload),
    meta: { domain: 'suppliers', handled: true },
    showToastOnError: false,
    onSuccess: () => {
      trackBusinessEvent('supplier.created', { success: true });
      setNewName('');
      setNewWebsite('');
      setShowAddForm(false);
      showCalmToast({ variant: 'success', title: t('suppliers.success.created') });
      invalidateAfterSupplierChange(queryClient);
    },
    onError: (err) => {
      trackMutationFailure('suppliers', err);
      showErrorToast(t('suppliers.error.create'));
    },
  });

  const patchMutation = useAetherMutation<
    Awaited<ReturnType<typeof suppliersApi.patch>>,
    { id: string; autoSyncEnabled: boolean },
    OptimisticContext<SupplierDetail> & { id: string }
  >({
    mutationFn: ({ id, autoSyncEnabled }: { id: string; autoSyncEnabled: boolean }) =>
      suppliersApi.patch(id, { autoSyncEnabled }),
    meta: { domain: 'suppliers', handled: true },
    showToastOnError: false,
    onMutate: async ({ id, autoSyncEnabled }) => {
      const previous = queryClient.getQueryData<SupplierDetail>(queryKeys.suppliers.detail(id));
      if (!previous) return { previous: undefined, id };
      const ctx = await optimisticPatch<SupplierDetail>(
        queryClient,
        queryKeys.suppliers.detail(id),
        (old) => ({ ...old!, autoSyncEnabled }),
      );
      return { ...ctx, id };
    },
    onError: (err, { id }, context) => {
      trackMutationFailure('suppliers', err);
      rollbackQueryData(queryClient, queryKeys.suppliers.detail(id), context);
      showErrorToast(t('suppliers.error.settings'));
    },
    onSuccess: (_data, { id, autoSyncEnabled }) => {
      trackBusinessEvent('supplier.settings_updated', { supplierId: id, autoSyncEnabled });
      invalidateAfterSupplierChange(queryClient);
    },
  });

  const openSupplier = (id: string) => setSelectedId(id);
  const closeDetail = () => setSelectedId(null);

  const monitor = async (id: string) => {
    if (isDemoSupplierId(id)) {
      const now = new Date().toISOString();
      setDemoOverrides((prev) => ({
        ...prev,
        [id]: { ...prev[id], lastSyncAt: now, lastAutoSyncAt: now },
      }));
      showCalmToast({ variant: 'success', title: t('suppliers.success.syncDemo') });
      const name = getSuppliersDemoSnapshot().suppliers.find((s) => s.id === id)?.name;
      afterSupplierSynced(id, { supplierName: name, lastSyncAt: now });
      if (selectedId === id) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.detail(id) });
      }
      return;
    }
    setMonitoringId(id);
    await monitorMutation.mutateAsync(id);
  };

  const setAutoSync = async (id: string, enabled: boolean) => {
    if (isDemoSupplierId(id)) {
      const baseStatus =
        getSuppliersDemoSnapshot().suppliers.find((s) => s.id === id)?.status ?? 'active';
      setDemoOverrides((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          autoSyncEnabled: enabled,
          monitoringLabel: demoMonitoringLabel(baseStatus, enabled),
        },
      }));
      void queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.detail(id) });
      return;
    }
    await patchMutation.mutateAsync({ id, autoSyncEnabled: enabled });
  };

  const createSupplier = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newWebsite.trim()) {
      const message = t('suppliers.add.validation');
      setAddFormError(message);
      announceStatus(message);
      return;
    }
    setAddFormError(null);
    await createMutation.mutateAsync({
      name: newName.trim(),
      website: newWebsite.trim(),
    });
  };

  const handleNewNameChange = useCallback(
    (value: string) => {
      setNewName(value);
      if (addFormError) setAddFormError(null);
    },
    [addFormError],
  );

  const handleNewWebsiteChange = useCallback(
    (value: string) => {
      setNewWebsite(value);
      if (addFormError) setAddFormError(null);
    },
    [addFormError],
  );

  return {
    viewModel,
    loading,
    error: errorMessage,
    reload,
    statusTab,
    setStatusTab,
    searchQuery,
    setSearchQuery,
    filteredSuppliers,
    pendingChangeCount,
    selectedId,
    detail: detail ?? null,
    detailLoading,
    openSupplier,
    closeDetail,
    monitor,
    monitoringId,
    setAutoSync,
    showAddForm,
    setShowAddForm,
    newName,
    setNewName: handleNewNameChange,
    newWebsite,
    setNewWebsite: handleNewWebsiteChange,
    addFormError,
    creating: createMutation.isPending,
    createSupplier,
    highlightedSupplierId,
  };
}
