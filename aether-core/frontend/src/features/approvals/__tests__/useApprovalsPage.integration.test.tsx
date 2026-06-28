import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useApprovalsPage } from '../hooks/useApprovalsPage';
import { createHookWrapper } from '@/test/render';
import { createTestDataAdapter } from '@/test/createTestDataAdapter';
import { buildHighRiskApproval, buildLowRiskApproval } from '@/test/factories/approval';
import { queryKeys } from '@/lib/query/keys';
import { ACTIVITY_ITEM_EVENT, NOTIFICATION_EVENT } from '@/lib/aetherLiveBus';
import { APPROVALS_CHANGED_EVENT, APPROVALS_CLEARED_EVENT } from '@/lib/approvalsCommandCenterSync';
import { showErrorToast } from '@/lib/toast';
import { trackBusinessEvent } from '@/lib/observability/businessEvents';

vi.mock('@/lib/observability/businessEvents', () => ({
  trackBusinessEvent: vi.fn(),
  trackMutationFailure: vi.fn(),
}));
import { useAppShellStore } from '@/lib/stores/appShellStore';
import type { ApprovalItem } from '@/types/approval';

describe('useApprovalsPage integration', () => {
  const highRisk = buildHighRiskApproval();
  const lowRisk = buildLowRiskApproval();

  beforeEach(() => {
    vi.clearAllMocks();
    useAppShellStore.getState().setPendingApprovalsCount(0);
  });

  it('approve high-risk removes item from cache and dispatches activity event', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const invalidateSpy = vi.fn();
    const { Wrapper, queryClient } = createHookWrapper({
      adapter: createTestDataAdapter({ approvals: [highRisk, lowRisk] }),
    });
    vi.spyOn(queryClient, 'invalidateQueries').mockImplementation(invalidateSpy);

    queryClient.setQueryData<ApprovalItem[]>(queryKeys.approvals.list(), [highRisk, lowRisk]);

    const { result } = renderHook(() => useApprovalsPage(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.filteredPending.length).toBeGreaterThan(0);
    });

    await act(async () => {
      await result.current.resolveOne(highRisk.id, true);
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<ApprovalItem[]>(queryKeys.approvals.list());
      expect(cached?.find((a) => a.id === highRisk.id)).toBeUndefined();
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['approvals'] }),
    );

    const activityEvents = dispatchSpy.mock.calls
      .map((c) => c[0] as CustomEvent)
      .filter((e) => e.type === ACTIVITY_ITEM_EVENT);
    expect(activityEvents.length).toBeGreaterThan(0);
    expect(activityEvents[0]?.detail?.category).toBe('approval');

    expect(result.current.recentEnriched.some((r) => r.item.id === highRisk.id)).toBe(true);

    const notificationEvents = dispatchSpy.mock.calls
      .map((c) => c[0] as CustomEvent)
      .filter((e) => e.type === NOTIFICATION_EVENT);
    expect(notificationEvents.length).toBeGreaterThan(0);
    const approvalSyncEvents = dispatchSpy.mock.calls
      .map((c) => c[0] as CustomEvent)
      .filter((e) => e.type === APPROVALS_CHANGED_EVENT);
    expect(approvalSyncEvents.length).toBeGreaterThan(0);
  });

  it('rolls back list and shows error toast when resolve fails', async () => {
    const { Wrapper, queryClient } = createHookWrapper({
      adapter: createTestDataAdapter({
        approvals: [highRisk],
        resolveFails: true,
      }),
    });

    queryClient.setQueryData<ApprovalItem[]>(queryKeys.approvals.list(), [highRisk]);

    const { result } = renderHook(() => useApprovalsPage(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.pendingCount).toBe(1));

    await act(async () => {
      await result.current.resolveOne(highRisk.id, true);
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<ApprovalItem[]>(queryKeys.approvals.list());
      expect(cached?.find((a) => a.id === highRisk.id)).toBeDefined();
    });

    expect(showErrorToast).toHaveBeenCalled();
  });

  it('rolls back list and shows error toast when reject fails', async () => {
    const { Wrapper, queryClient } = createHookWrapper({
      adapter: createTestDataAdapter({
        approvals: [highRisk],
        resolveFails: true,
      }),
    });

    queryClient.setQueryData<ApprovalItem[]>(queryKeys.approvals.list(), [highRisk]);

    const { result } = renderHook(() => useApprovalsPage(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.pendingCount).toBe(1));

    await act(async () => {
      await result.current.resolveOne(highRisk.id, false);
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<ApprovalItem[]>(queryKeys.approvals.list());
      expect(cached?.find((a) => a.id === highRisk.id)).toBeDefined();
    });

    expect(showErrorToast).toHaveBeenCalled();
  });

  it('updates app shell pending count after resolve', async () => {
    const { Wrapper, queryClient } = createHookWrapper({
      adapter: createTestDataAdapter({ approvals: [highRisk, lowRisk] }),
    });

    queryClient.setQueryData<ApprovalItem[]>(queryKeys.approvals.list(), [highRisk, lowRisk]);

    const { result } = renderHook(() => useApprovalsPage(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.pendingCount).toBe(2));

    await act(async () => {
      await result.current.resolveOne(highRisk.id, true);
    });

    await waitFor(() => {
      expect(useAppShellStore.getState().pendingApprovalsCount).toBe(1);
    });
  });

  it('reject high-risk removes item and dispatches approval activity event', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const { Wrapper, queryClient } = createHookWrapper({
      adapter: createTestDataAdapter({ approvals: [highRisk, lowRisk] }),
    });

    queryClient.setQueryData<ApprovalItem[]>(queryKeys.approvals.list(), [highRisk, lowRisk]);

    const { result } = renderHook(() => useApprovalsPage(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.highRiskItems.length).toBe(1));

    await act(async () => {
      await result.current.resolveOne(highRisk.id, false);
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<ApprovalItem[]>(queryKeys.approvals.list());
      expect(cached?.find((a) => a.id === highRisk.id)).toBeUndefined();
    });

    const activityEvents = dispatchSpy.mock.calls
      .map((c) => c[0] as CustomEvent)
      .filter((e) => e.type === ACTIVITY_ITEM_EVENT);
    expect(activityEvents.length).toBeGreaterThan(0);
    expect(activityEvents[0]?.detail?.category).toBe('approval');
    const notificationEvents = dispatchSpy.mock.calls
      .map((c) => c[0] as CustomEvent)
      .filter((e) => e.type === NOTIFICATION_EVENT);
    expect(notificationEvents.length).toBeGreaterThan(0);
    expect(result.current.recentEnriched[0]?.outcome).toBe('rejected');
  });

  it('dispatches queue empty event when last pending approval is resolved', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const { Wrapper, queryClient } = createHookWrapper({
      adapter: createTestDataAdapter({ approvals: [highRisk] }),
    });

    queryClient.setQueryData<ApprovalItem[]>(queryKeys.approvals.list(), [highRisk]);

    const { result } = renderHook(() => useApprovalsPage(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.pendingCount).toBe(1));

    await act(async () => {
      await result.current.resolveOne(highRisk.id, true);
    });

    await waitFor(() => {
      expect(useAppShellStore.getState().pendingApprovalsCount).toBe(0);
    });

    const clearedEvents = dispatchSpy.mock.calls
      .map((c) => c[0] as Event)
      .filter((e) => e.type === APPROVALS_CLEARED_EVENT);
    expect(clearedEvents.length).toBeGreaterThan(0);
  });

  it('bulk approve resolves multiple items from cache', async () => {
    const lowA = buildLowRiskApproval({ id: 'bulk-low-a' });
    const lowB = buildLowRiskApproval({ id: 'bulk-low-b' });
    const { Wrapper, queryClient } = createHookWrapper({
      adapter: createTestDataAdapter({ approvals: [lowA, lowB, highRisk] }),
    });

    queryClient.setQueryData<ApprovalItem[]>(queryKeys.approvals.list(), [lowA, lowB, highRisk]);

    const { result } = renderHook(() => useApprovalsPage(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.pendingCount).toBe(3));

    await act(async () => {
      await result.current.resolveMany([lowA.id, lowB.id]);
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<ApprovalItem[]>(queryKeys.approvals.list());
      expect(cached?.find((a) => a.id === lowA.id)).toBeUndefined();
      expect(cached?.find((a) => a.id === lowB.id)).toBeUndefined();
      expect(cached?.find((a) => a.id === highRisk.id)).toBeDefined();
    });

    expect(result.current.recentEnriched.length).toBe(2);
    expect(trackBusinessEvent).toHaveBeenCalledWith('approval.bulk_resolved', {
      ok: 2,
      fail: 0,
      total: 2,
    });
  });

  it('auto-apply removes low-risk items and keeps high-risk pending', async () => {
    const lowA = buildLowRiskApproval({ id: 'auto-low-a' });
    const { Wrapper, queryClient } = createHookWrapper({
      adapter: createTestDataAdapter({ approvals: [lowA, highRisk] }),
    });

    queryClient.setQueryData<ApprovalItem[]>(queryKeys.approvals.list(), [lowA, highRisk]);

    const { result } = renderHook(() => useApprovalsPage(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.lowRiskItems.length).toBe(1));

    await act(async () => {
      await result.current.runAutoApply();
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<ApprovalItem[]>(queryKeys.approvals.list());
      expect(cached?.find((a) => a.id === lowA.id)).toBeUndefined();
      expect(cached?.find((a) => a.id === highRisk.id)).toBeDefined();
      expect(result.current.pendingCount).toBe(1);
    });
  });

  it('recent tab shows handled items after resolve', async () => {
    const { Wrapper, queryClient } = createHookWrapper({
      adapter: createTestDataAdapter({ approvals: [highRisk] }),
    });

    queryClient.setQueryData<ApprovalItem[]>(queryKeys.approvals.list(), [highRisk]);

    const { result } = renderHook(() => useApprovalsPage(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.highRiskItems.length).toBe(1));

    await act(async () => {
      await result.current.resolveOne(highRisk.id, true);
    });

    act(() => {
      result.current.setActiveTab('recent');
    });

    await waitFor(() => {
      expect(result.current.recentEnriched.length).toBe(1);
      expect(result.current.recentEnriched[0]?.outcome).toBe('approved');
    });
  });
});
