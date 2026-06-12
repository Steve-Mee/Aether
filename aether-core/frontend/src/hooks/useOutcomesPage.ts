import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { BillingSummary } from '@/lib/api';
import { insightsRepository } from '@/lib/data';
import { aetherErrorMessage, useAetherMutation } from '@/lib/query/hooks';
import { trackBusinessEvent, trackMutationFailure } from '@/lib/observability/businessEvents';
import { queryKeys } from '@/lib/query/keys';
import type { OutcomeReport } from '@/types/insight';

export interface OutcomeRecord {
  id: string;
  metric: string;
  baseline: number;
  observed: number;
  uplift: number;
  confidence: number;
  verificationStatus: string;
  periodStart: string;
  periodEnd: string;
}

const REPORT_DAYS = 30;

export function useOutcomesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'outcomes' | 'billing'>('outcomes');
  const [reconciling, setReconciling] = useState(false);

  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.outcomes(REPORT_DAYS),
        queryFn: () => insightsRepository.outcomeReport(REPORT_DAYS),
        meta: { domain: 'outcomes' },
      },
      {
        queryKey: queryKeys.billing(REPORT_DAYS),
        queryFn: () => insightsRepository.billingSummary(REPORT_DAYS),
        meta: { domain: 'outcomes' },
      },
    ],
  });

  const report = results[0].data ?? null;
  const billing = results[1].data ?? null;
  const loading = results.some((r) => r.isLoading);
  const error = results.find((r) => r.error)?.error ?? null;

  const reconcileMutation = useAetherMutation({
    mutationFn: () => insightsRepository.reconcileBilling(),
    meta: { domain: 'outcomes', handled: true },
    showToastOnError: true,
    onMutate: () => setReconciling(true),
    onSuccess: () => {
      trackBusinessEvent('outcomes.reconciled', { success: true });
    },
    onError: (err) => {
      trackMutationFailure('outcomes', err);
    },
    onSettled: () => {
      setReconciling(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing(REPORT_DAYS) });
    },
  });

  return {
    tab,
    setTab,
    report: report as OutcomeReport | null,
    billing: billing as BillingSummary | null,
    loading,
    error: aetherErrorMessage(error),
    reconciling,
    reconcile: () => reconcileMutation.mutate(undefined),
    reload: () => {
      void results[0].refetch();
      void results[1].refetch();
    },
  };
}
