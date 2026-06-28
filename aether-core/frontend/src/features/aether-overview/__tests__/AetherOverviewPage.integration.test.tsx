import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AetherOverviewPage from '@/pages/AetherOverviewPage';
import { mockDataAdapter } from '@/lib/data/adapters/mockAdapter';
import {
  DEFAULT_GOAL_PREFS,
  DEFAULT_MERCHANT_SETTINGS,
  DEFAULT_PROACTIVE_PREFS,
} from '@/lib/settings/merchantSettingsTypes';
import { renderWithProviders } from '@/test/render';

const overviewTestAdapter = {
  ...mockDataAdapter,
  fetchSettings: async () => ({
    ...DEFAULT_MERCHANT_SETTINGS,
    proactivePrefs: { ...DEFAULT_PROACTIVE_PREFS, enabled: true, visibility: 'all' as const },
    goalPrefs: { ...DEFAULT_GOAL_PREFS, enabled: true },
  }),
};

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
      proactiveCount: 1,
      autonomyRate: 0.7,
      autonomousActions7d: 4,
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

vi.mock('@/lib/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/config/env')>();
  return {
    ...actual,
    env: { ...actual.env, isLiveMode: false, isMockMode: true },
  };
});

describe('AetherOverviewPage integration', () => {
  it('renders overview sections and filter bar', async () => {
    renderWithProviders(<AetherOverviewPage />, {
      initialEntries: ['/overview'],
      withCommand: true,
      adapter: overviewTestAdapter,
    });

    expect(screen.getByTestId('aether-overview-page')).toBeInTheDocument();
    expect(screen.getByTestId('overview-filter-bar')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('overview-attention-section')).toBeInTheDocument();
    });

    expect(screen.getByTestId('overview-proactive-section')).toBeInTheDocument();
    expect(screen.getByTestId('overview-goals-section')).toBeInTheDocument();
    expect(screen.getByTestId('overview-activity-feed')).toBeInTheDocument();
  });

  it('updates visible sections when proactive filter is selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AetherOverviewPage />, {
      initialEntries: ['/overview'],
      withCommand: true,
      adapter: overviewTestAdapter,
    });

    await waitFor(() => {
      expect(screen.getByTestId('overview-activity-feed')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('overview-filter-type-proactive'));

    await waitFor(() => {
      expect(screen.queryByTestId('overview-activity-feed')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('overview-proactive-section')).toBeInTheDocument();
  });
});
