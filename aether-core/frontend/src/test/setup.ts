import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { testServer } from './server';
import { resetMswState } from './handlers';
import { resetDataAdapter, setDataAdapterForTests } from '@/lib/data/createDataAdapter';
import { resetMockAdapterState } from '@/lib/data/adapters/mockAdapter';
import { resetApprovalFactorySeq } from './factories/approval';
import { resetCommandFactorySeq } from './factories/command';
import type { DashboardSummary } from '@/lib/api';

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
      timestamp: '2026-06-04T10:00:00.000Z',
    } satisfies DashboardSummary,
    connected: true,
    error: null,
    reload: vi.fn(),
  }),
}));

vi.mock('@/lib/toast', () => ({
  showCalmToast: vi.fn(),
  showErrorToast: vi.fn(),
}));

vi.mock('@/lib/notifications/NotificationContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/notifications/NotificationContext')>();
  return {
    ...actual,
    notify: vi.fn(),
  };
});

/** Imperative notify mock — use in tests that assert cross-screen notification dispatch. */
export { notify as mockNotify } from '@/lib/notifications/NotificationContext';

beforeAll(() => {
  testServer.listen({ onUnhandledRequest: 'warn' });
});

afterEach(() => {
  cleanup();
  testServer.resetHandlers();
  resetMswState();
  setDataAdapterForTests(null);
  resetDataAdapter();
  resetMockAdapterState();
  resetApprovalFactorySeq();
  resetCommandFactorySeq();
});

afterAll(() => {
  testServer.close();
});
