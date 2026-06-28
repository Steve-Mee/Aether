import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAetherOverviewPage } from '../useAetherOverviewPage';
import { createCriticalFlowWrapper } from '@/test/render';
import { buildHighRiskApproval } from '@/test/factories/approval';
import { createTestDataAdapter } from '@/test/createTestDataAdapter';

vi.mock('@/lib/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/config/env')>();
  return {
    ...actual,
    env: { ...actual.env, isLiveMode: false, isMockMode: true },
  };
});

vi.mock('@/lib/useDashboardStream', () => ({
  useDashboardStream: () => ({
    data: {
      status: 'live' as const,
      tenantDisplayName: 'Demo Merchant',
      productCount: 12,
      lowMarginProducts: 2,
      unreadEmails: 3,
      pendingApprovals: 1,
      recentCommands: 8,
      revenueUplift30d: 1200,
      proactiveCount: 2,
      autonomyRate: 0.72,
      autonomousActions7d: 5,
      timestamp: '2026-06-04T10:00:00.000Z',
    },
    connected: true,
    error: null,
    reload: vi.fn(),
  }),
}));

vi.mock('@/features/aether-overview/hooks/useOverviewStream', () => ({
  useOverviewStream: () => {},
}));

describe('useAetherOverviewPage', () => {
  it('loads pending approvals and builds KPI strip', async () => {
    const adapter = createTestDataAdapter({
      approvals: [buildHighRiskApproval()],
    });
    const { Wrapper } = createCriticalFlowWrapper({
      initialEntries: ['/overview'],
      adapter,
    });

    const { result } = renderHook(() => useAetherOverviewPage(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.pendingCount).toBeGreaterThanOrEqual(1);
    expect(result.current.kpis.length).toBeGreaterThanOrEqual(3);
    expect(result.current.showAttention).toBe(true);
  });

  it('filters activity when action type is autonomous', async () => {
    const { Wrapper } = createCriticalFlowWrapper({ initialEntries: ['/overview'] });
    const { result } = renderHook(() => useAetherOverviewPage(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.updateFilter('actionType', 'autonomous');

    await waitFor(() => {
      const allAutonomous =
        result.current.filteredActivityCount === 0 ||
        result.current.unifiedItems.every((i) => {
          if (i.kind !== 'activity') return true;
          const status = (i.payload as { status?: string }).status;
          return status === 'autonomous';
        }) ||
        result.current.activityGroups.every((g) => g.items.every((i) => i.status === 'autonomous'));
      expect(allAutonomous).toBe(true);
    });
  });
});
