import { describe, expect, it, vi } from 'vitest';
import type { DashboardSummary } from '@/lib/api';
import { buildSignals } from '@/components/ProactiveSidecar';

vi.mock('@/lib/i18n', () => ({
  t: (key: string) => key,
  formatCurrency: (n: number) => String(n),
}));

describe('buildSignals proactive count', () => {
  const base: DashboardSummary = {
    status: 'live',
    productCount: 0,
    lowMarginProducts: 0,
    unreadEmails: 0,
    pendingApprovals: 0,
    recentCommands: 0,
    revenueUplift30d: 0,
  };

  it('adds proactive signal when count > 0', () => {
    const signals = buildSignals({ ...base, proactiveCount: 2 });
    expect(signals.some((s) => s.id === 'proactive')).toBe(true);
  });

  it('omits proactive signal when count is zero', () => {
    const signals = buildSignals({ ...base, proactiveCount: 0 });
    expect(signals.some((s) => s.id === 'proactive')).toBe(false);
  });
});
