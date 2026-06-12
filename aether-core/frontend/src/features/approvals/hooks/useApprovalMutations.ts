import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboard } from '@/lib/DashboardContext';
import { approvalsApi } from '@/features/approvals/api';
import { invalidateAfterApprovalChange } from '@/lib/data/invalidateAfterMutation';
import { afterApprovalResolved } from '@/lib/data/sideEffects';
import { useAppShellStore } from '@/lib/stores/appShellStore';
import { useAetherMutation } from '@/lib/query/hooks';
import {
  optimisticListRemove,
  rollbackQueryData,
  type OptimisticContext,
} from '@/lib/query/optimistic';
import {
  notifyApprovalsChanged,
  notifyApprovalsQueueEmpty,
} from '@/lib/approvalsCommandCenterSync';
import { t } from '@/lib/i18n';
import { dispatchNotification } from '@/lib/aetherLiveBus';
import { showCalmToast, showErrorToast } from '@/lib/toast';
import { queryKeys } from '@/lib/query/keys';
import { trackBusinessEvent, trackMutationFailure } from '@/lib/observability/businessEvents';
import { withBusinessSpan } from '@/lib/observability/performanceSpans';
import type { ApprovalItem } from '@/types/approval';

type ApprovalResolveContext = OptimisticContext<ApprovalItem[]> & { item?: ApprovalItem };

export interface UseApprovalMutationsOptions {
  /** Called when resolve mutation settles (e.g. clear resolvingId). */
  onResolveSettled?: () => void;
  /** Show success toast + notification on afterApprovalSuccess (default true). */
  showSuccessFeedback?: boolean;
  /** Show error toast on resolve failure (default true). */
  showResolveErrorToast?: boolean;
}

export function useApprovalMutations(options: UseApprovalMutationsOptions = {}) {
  const { onResolveSettled, showSuccessFeedback = true, showResolveErrorToast = true } = options;

  const queryClient = useQueryClient();
  const { reload: reloadDashboard } = useDashboard();
  const setPendingApprovalsCount = useAppShellStore((s) => s.setPendingApprovalsCount);

  const countPendingFromCache = useCallback(() => {
    const list = queryClient.getQueryData<ApprovalItem[]>(queryKeys.approvals.list()) ?? [];
    return list.filter((a) => a.status === 'pending').length;
  }, [queryClient]);

  const afterApprovalSuccess = useCallback(
    async (message: string) => {
      const remaining = countPendingFromCache();
      setPendingApprovalsCount(remaining);
      if (showSuccessFeedback && message) {
        showCalmToast({ variant: 'success', title: message });
      }
      invalidateAfterApprovalChange(queryClient);
      reloadDashboard();
      notifyApprovalsChanged(remaining);
      if (remaining === 0) {
        notifyApprovalsQueueEmpty();
      }
      return remaining;
    },
    [
      countPendingFromCache,
      queryClient,
      reloadDashboard,
      setPendingApprovalsCount,
      showSuccessFeedback,
    ],
  );

  const resolveMutation = useAetherMutation<
    Awaited<ReturnType<typeof approvalsApi.resolve>>,
    { id: string; approve: boolean },
    ApprovalResolveContext
  >({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      withBusinessSpan('approval.resolve', { approvalId: id, approve }, () =>
        approvalsApi.resolve(id, approve),
      ),
    meta: { domain: 'approvals', handled: true, silentToast: true },
    showToastOnError: showResolveErrorToast,
    onMutate: async ({ id }) => {
      const previous = queryClient.getQueryData<ApprovalItem[]>(queryKeys.approvals.list());
      const item = previous?.find((a) => a.id === id);
      const ctx = await optimisticListRemove<ApprovalItem>(
        queryClient,
        queryKeys.approvals.list(),
        id,
      );
      return { ...ctx, item };
    },
    onSuccess: (_data, { id, approve }, context) => {
      trackBusinessEvent('approval.resolved', {
        approvalId: id,
        outcome: approve ? 'approved' : 'rejected',
        module: context?.item?.module ?? null,
      });
      if (context?.item) {
        afterApprovalResolved(context.item, approve ? 'approved' : 'rejected', {
          skipAnnounce: !showSuccessFeedback,
        });
      }
    },
    onError: (err, _vars, context) => {
      trackMutationFailure('approvals', err);
      rollbackQueryData(queryClient, queryKeys.approvals.list(), context);
      if (showResolveErrorToast) {
        showErrorToast(t('approvals.error.resolve'));
      }
    },
    onSettled: () => {
      onResolveSettled?.();
    },
  });

  const autoApplyMutation = useAetherMutation<
    Awaited<ReturnType<typeof approvalsApi.autoApply>>,
    void,
    OptimisticContext<ApprovalItem[]>
  >({
    mutationFn: () => approvalsApi.autoApply(),
    meta: { domain: 'approvals', handled: true, silentToast: true },
    showToastOnError: true,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.approvals.list() });
      const previous = queryClient.getQueryData<ApprovalItem[]>(queryKeys.approvals.list());
      queryClient.setQueryData<ApprovalItem[]>(
        queryKeys.approvals.list(),
        (old) => old?.filter((a) => a.actionType.includes('refund')) ?? [],
      );
      return { previous };
    },
    onSuccess: (res) => {
      trackBusinessEvent('approval.auto_apply', {
        applied: res.applied,
        skipped: res.skipped,
      });
      const msg = t('approvals.success.autoApply')
        .replace('{applied}', String(res.applied))
        .replace('{skipped}', String(res.skipped));
      dispatchNotification({
        title: msg,
        body: t('notifications.approvalHandled.body'),
        severity: 'info',
        href: '/approvals',
        source: 'user',
        category: 'high_risk_approval',
        skipAnnounce: !showSuccessFeedback,
      });
    },
    onError: (err, _vars, context) => {
      trackMutationFailure('approvals', err);
      rollbackQueryData(queryClient, queryKeys.approvals.list(), context);
      showErrorToast(t('approvals.error.autoApply'));
    },
  });

  const runAutoApply = useCallback(async () => {
    const res = await autoApplyMutation.mutateAsync(undefined);
    const msg = t('approvals.success.autoApply')
      .replace('{applied}', String(res.applied))
      .replace('{skipped}', String(res.skipped));
    await afterApprovalSuccess(msg);
    return res;
  }, [afterApprovalSuccess, autoApplyMutation]);

  return {
    resolveMutation,
    autoApplyMutation,
    afterApprovalSuccess,
    countPendingFromCache,
    runAutoApply,
    isPending: resolveMutation.isPending || autoApplyMutation.isPending,
  };
}
