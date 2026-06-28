import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createCriticalFlowWrapper } from '@/test/render';
import { useCommand } from '@/lib/CommandContext';
import { useApprovalsPage } from '@/features/approvals/hooks/useApprovalsPage';
import { useHomeLanding } from '@/features/command-center/hooks/useHomeLanding';
import { useActivityPage } from '@/hooks/useActivityPage';
import { useNotifications } from '@/lib/notifications/NotificationContext';
import { createTestDataAdapter } from '@/test/createTestDataAdapter';
import { buildHighRiskApproval, buildLowRiskApproval } from '@/test/factories/approval';
import { buildCommandResult } from '@/test/factories/command';
import { ACTIVITY_ITEM_EVENT, NOTIFICATION_EVENT } from '@/lib/aetherLiveBus';
import { APPROVALS_CHANGED_EVENT } from '@/lib/approvalsCommandCenterSync';
import { COMMAND_EXECUTED_EVENT } from '@/lib/data/commandEvents';
import { queryKeys } from '@/lib/query/keys';
import { useAppShellStore } from '@/lib/stores/appShellStore';
import type { ApprovalItem } from '@/types/approval';
import type { AutonomyMetricsResponse } from '@/types/insight';

vi.mock('@/lib/config/env', () => ({
  env: { dataSource: 'mock' as const },
}));

vi.mock('@/lib/useDashboardStream', () => ({
  useDashboardStream: () => ({
    data: {
      status: 'live' as const,
      tenantDisplayName: 'Demo Merchant',
      productCount: 12,
      lowMarginProducts: 2,
      unreadEmails: 3,
      pendingApprovals: 2,
      recentCommands: 8,
      revenueUplift30d: 1200,
      timestamp: '2026-06-04T10:00:00.000Z',
    },
    connected: true,
    error: null,
    reload: vi.fn(),
  }),
}));

describe('Critical flows — command bar side effects', () => {
  beforeEach(() => {
    useAppShellStore.getState().setPendingApprovalsCount(0);
  });

  it('executeCommand dispatches activity, invalidates cache, and updates live activity', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const { Wrapper, queryClient } = createCriticalFlowWrapper({
      initialEntries: ['/suppliers'],
    });
    vi.spyOn(queryClient, 'invalidateQueries');

    const { result: commandResult } = renderHook(
      () => ({
        command: useCommand(),
        notifications: useNotifications(),
      }),
      { wrapper: Wrapper },
    );

    await act(async () => {
      await commandResult.current.command.executeCommand('Sync voorraad');
    });

    await waitFor(() => {
      expect(commandResult.current.command.lastResult).not.toBeNull();
    });

    const activityEvents = dispatchSpy.mock.calls
      .map((c) => c[0] as CustomEvent)
      .filter((e) => e.type === ACTIVITY_ITEM_EVENT);
    expect(activityEvents.length).toBeGreaterThan(0);
    expect(activityEvents[0]?.detail?.category).toBe('command');

    const notificationEvents = dispatchSpy.mock.calls
      .map((c) => c[0] as CustomEvent)
      .filter((e) => e.type === NOTIFICATION_EVENT);
    expect(notificationEvents.length).toBe(0);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.activity({ days: 7, limit: 5 }) }),
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.approvals.list() }),
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: expect.arrayContaining(['autonomy-metrics']) }),
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['activity'] }),
    );

    await waitFor(() => {
      expect(commandResult.current.notifications.lastActivityAt).not.toBeNull();
    });
  });

  it('optimistically bumps cached autonomy metrics after command execute', async () => {
    const metricsSeed: AutonomyMetricsResponse = {
      totalDecisions: 8,
      autonomousDecisions: 5,
      humanGatedDecisions: 3,
      autonomyRate: 0.625,
      targetMet: true,
      status: 'live',
    };
    const { Wrapper, queryClient } = createCriticalFlowWrapper({
      initialEntries: ['/suppliers'],
    });
    queryClient.setQueryData(queryKeys.autonomyMetrics(30), metricsSeed);

    const { result } = renderHook(() => useCommand(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.executeCommand('Verhoog autonomie');
    });

    await waitFor(() => {
      expect(result.current.lastResult).not.toBeNull();
    });

    expect(
      queryClient.getQueryData<AutonomyMetricsResponse>(queryKeys.autonomyMetrics(30)),
    ).toMatchObject({
      totalDecisions: 9,
      autonomousDecisions: 6,
    });
  });
});

describe('Critical flows — approval side effects', () => {
  const highRisk = buildHighRiskApproval();
  const lowRisk = buildLowRiskApproval();

  beforeEach(() => {
    useAppShellStore.getState().setPendingApprovalsCount(0);
  });

  it('approve high-risk updates cache, shell count, activity, and notifications', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const { Wrapper, queryClient } = createCriticalFlowWrapper({
      adapter: createTestDataAdapter({ approvals: [highRisk, lowRisk] }),
      initialEntries: ['/approvals'],
    });

    queryClient.setQueryData<ApprovalItem[]>(queryKeys.approvals.list(), [highRisk, lowRisk]);

    const { result } = renderHook(
      () => ({
        page: useApprovalsPage(),
        notifications: useNotifications(),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.page.pendingCount).toBe(2));

    const notifCountBefore = result.current.notifications.notifications.length;

    await act(async () => {
      await result.current.page.resolveOne(highRisk.id, true);
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<ApprovalItem[]>(queryKeys.approvals.list());
      expect(cached?.find((a) => a.id === highRisk.id)).toBeUndefined();
    });

    expect(useAppShellStore.getState().pendingApprovalsCount).toBe(1);

    const activityEvents = dispatchSpy.mock.calls
      .map((c) => c[0] as CustomEvent)
      .filter((e) => e.type === ACTIVITY_ITEM_EVENT);
    expect(activityEvents.some((e) => e.detail?.category === 'approval')).toBe(true);

    const notificationEvents = dispatchSpy.mock.calls
      .map((c) => c[0] as CustomEvent)
      .filter((e) => e.type === NOTIFICATION_EVENT);
    expect(notificationEvents.length).toBeGreaterThan(0);

    const approvalSyncEvents = dispatchSpy.mock.calls
      .map((c) => c[0] as CustomEvent)
      .filter((e) => e.type === APPROVALS_CHANGED_EVENT);
    expect(approvalSyncEvents.length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(result.current.notifications.notifications.length).toBeGreaterThan(notifCountBefore);
    });
  });
});

describe('Critical flows — cross-screen sequence', () => {
  const highRisk = buildHighRiskApproval();
  const lowRisk = buildLowRiskApproval();

  beforeEach(() => {
    useAppShellStore.getState().setPendingApprovalsCount(0);
  });

  it('approval resolve propagates to home landing and activity feed', async () => {
    const { Wrapper, queryClient } = createCriticalFlowWrapper({
      adapter: createTestDataAdapter({ approvals: [highRisk, lowRisk] }),
      initialEntries: ['/approvals'],
    });

    queryClient.setQueryData<ApprovalItem[]>(queryKeys.approvals.list(), [highRisk, lowRisk]);

    const { result } = renderHook(
      () => ({
        page: useApprovalsPage(),
        home: useHomeLanding(),
        activity: useActivityPage(),
      }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.page.pendingCount).toBe(2));

    await act(async () => {
      await result.current.page.resolveOne(highRisk.id, true);
    });

    await waitFor(() => {
      expect(useAppShellStore.getState().pendingApprovalsCount).toBe(1);
    });

    await waitFor(() => {
      expect(result.current.home.highRiskPendingCount).toBe(0);
    });

    await waitFor(() => {
      expect(
        result.current.activity.merged.items.some(
          (i) => i.category === 'approval' && i.related?.id === highRisk.id,
        ),
      ).toBe(true);
    });
  });

  it('COMMAND_EXECUTED_EVENT invalidates activity but not approvals (invariant)', async () => {
    vi.useFakeTimers();
    const { Wrapper, queryClient } = createCriticalFlowWrapper({
      initialEntries: ['/command-center'],
    });
    vi.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useCommand(), { wrapper: Wrapper });

    act(() => {
      window.dispatchEvent(new CustomEvent(COMMAND_EXECUTED_EVENT));
    });
    await vi.advanceTimersByTimeAsync(300);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['activity'] }),
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.activity({ days: 7, limit: 5 }) }),
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.approvals.list() }),
    );
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.approvals.all() }),
    );
    vi.useRealTimers();
  });

  it('command with APPROVE_CHANGES intent invalidates approvals on direct mutation path', async () => {
    const { Wrapper, queryClient } = createCriticalFlowWrapper({
      initialEntries: ['/suppliers'],
      adapter: createTestDataAdapter({
        executeCommand: async (command) =>
          buildCommandResult({
            originalCommand: command.trim(),
            parsedIntent: 'APPROVE_CHANGES',
          }),
      }),
    });
    vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCommand(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.executeCommand('Toon goedkeuringen');
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.approvals.all() }),
    );
  });
});
