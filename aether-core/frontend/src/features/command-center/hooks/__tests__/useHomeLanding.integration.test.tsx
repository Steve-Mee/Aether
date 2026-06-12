import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useHomeLanding } from '../useHomeLanding';
import { createTestDataAdapter } from '@/test/createTestDataAdapter';
import { setDataAdapterForTests } from '@/lib/data/createDataAdapter';
import { DashboardProvider } from '@/lib/DashboardContext';
import { buildHighRiskApproval, buildLowRiskApproval } from '@/test/factories/approval';
import { useAppShellStore } from '@/lib/stores/appShellStore';
import QueryInvalidationBridge from '@/lib/query/QueryInvalidationBridge';
import { COMMAND_EXECUTED_EVENT } from '@/lib/data/commandEvents';
import { queryKeys } from '@/lib/query/keys';

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

describe('useHomeLanding integration', () => {
  beforeEach(() => {
    useAppShellStore.getState().setPendingApprovalsCount(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('syncs pending approvals count to app shell store', async () => {
    const adapter = createTestDataAdapter({
      approvals: [buildHighRiskApproval(), buildLowRiskApproval()],
    });
    setDataAdapterForTests(adapter);

    function Wrapper({ children }: { children: React.ReactNode }) {
      return createElement(
        QueryClientProvider,
        { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        createElement(
          MemoryRouter,
          { initialEntries: ['/command-center'] },
          createElement(DashboardProvider, null, children),
        ),
      );
    }

    renderHook(() => useHomeLanding(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(useAppShellStore.getState().pendingApprovalsCount).toBe(2);
    });
  });

  it('invalidates home landing queries when command executed event fires', async () => {
    vi.useFakeTimers();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.spyOn(queryClient, 'invalidateQueries');
    setDataAdapterForTests(createTestDataAdapter());

    function Wrapper({ children }: { children: React.ReactNode }) {
      return createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          MemoryRouter,
          { initialEntries: ['/command-center'] },
          createElement(
            DashboardProvider,
            null,
            createElement(QueryInvalidationBridge, null, children),
          ),
        ),
      );
    }

    renderHook(() => useHomeLanding(), { wrapper: Wrapper });

    window.dispatchEvent(new CustomEvent(COMMAND_EXECUTED_EVENT));
    await vi.advanceTimersByTimeAsync(300);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.activity({ days: 7, limit: 5 }),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.approvals.list(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['activity'],
    });
  });
});
