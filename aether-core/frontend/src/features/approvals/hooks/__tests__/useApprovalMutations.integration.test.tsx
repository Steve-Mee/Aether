import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useApprovalMutations } from '../useApprovalMutations';
import { createHookWrapper } from '@/test/render';
import { createTestDataAdapter } from '@/test/createTestDataAdapter';
import { buildHighRiskApproval, buildLowRiskApproval } from '@/test/factories/approval';
import { queryKeys } from '@/lib/query/keys';
import { ACTIVITY_ITEM_EVENT, NOTIFICATION_EVENT } from '@/lib/aetherLiveBus';
import type { ApprovalItem } from '@/types/approval';

describe('useApprovalMutations integration', () => {
  const highRisk = buildHighRiskApproval();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolve triggers activity and notification bus events', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const { Wrapper, queryClient } = createHookWrapper({
      adapter: createTestDataAdapter({ approvals: [highRisk] }),
    });

    queryClient.setQueryData<ApprovalItem[]>(queryKeys.approvals.list(), [highRisk]);

    const { result } = renderHook(() => useApprovalMutations(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.resolveMutation.mutateAsync({ id: highRisk.id, approve: true });
    });

    const activityEvents = dispatchSpy.mock.calls
      .map((c) => c[0] as CustomEvent)
      .filter((e) => e.type === ACTIVITY_ITEM_EVENT);
    expect(activityEvents.length).toBeGreaterThan(0);

    const notificationEvents = dispatchSpy.mock.calls
      .map((c) => c[0] as CustomEvent)
      .filter((e) => e.type === NOTIFICATION_EVENT);
    expect(notificationEvents.length).toBeGreaterThan(0);

    await waitFor(() => {
      const cached = queryClient.getQueryData<ApprovalItem[]>(queryKeys.approvals.list());
      expect(cached?.find((a) => a.id === highRisk.id)).toBeUndefined();
    });
  });

  it('runAutoApply invalidates approvals cache', async () => {
    const invalidateSpy = vi.fn();
    const lowRisk = buildLowRiskApproval({ id: 'auto-low' });
    const { Wrapper, queryClient } = createHookWrapper({
      adapter: createTestDataAdapter({ approvals: [lowRisk, highRisk] }),
    });
    vi.spyOn(queryClient, 'invalidateQueries').mockImplementation(invalidateSpy);

    queryClient.setQueryData<ApprovalItem[]>(queryKeys.approvals.list(), [lowRisk, highRisk]);

    const { result } = renderHook(() => useApprovalMutations(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.runAutoApply();
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['approvals'] }),
    );
  });
});
