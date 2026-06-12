import { describe, expect, it } from 'vitest';
import {
  buildHomeLandingViewModel,
  countHighRiskPendingApprovals,
  getTimeGreetingKey,
} from './buildHomeLandingViewModel';

const baseDashboard = {
  status: 'partial' as const,
  productCount: 10,
  lowMarginProducts: 0,
  unreadEmails: 0,
  pendingApprovals: 0,
  recentCommands: 0,
  revenueUplift30d: 0,
};

describe('buildHomeLandingViewModel', () => {
  it('hides high-risk metric card when count is zero', () => {
    const vm = buildHomeLandingViewModel({
      dashboard: baseDashboard,
      supplierOverview: null,
      highRiskPendingCount: 0,
    });
    expect(vm.metrics.map((m) => m.id)).not.toContain('high-risk-approvals');
    expect(vm.metrics).toHaveLength(3);
  });

  it('shows high-risk metric when count is positive', () => {
    const vm = buildHomeLandingViewModel({
      dashboard: { ...baseDashboard, pendingApprovals: 2 },
      supplierOverview: null,
      highRiskPendingCount: 2,
    });
    const card = vm.metrics.find((m) => m.id === 'high-risk-approvals');
    expect(card?.value).toBe('2');
    expect(card?.urgent).toBe(true);
    expect(card?.source).toBe('live');
  });

  it('marks revenue and time saved live when dashboard has values', () => {
    const vm = buildHomeLandingViewModel({
      dashboard: {
        ...baseDashboard,
        revenueUplift30d: 1200,
        timeSavedMinutes7d: 90,
        autonomousActions7d: 5,
      },
      supplierOverview: null,
      highRiskPendingCount: 0,
    });
    expect(vm.metrics.find((m) => m.id === 'revenue-uplift')?.source).toBe('live');
    expect(vm.metrics.find((m) => m.id === 'time-saved')?.source).toBe('live');
    expect(vm.metrics.find((m) => m.id === 'autonomous-actions')?.source).toBe('live');
  });

  it('builds summary bullets in priority order', () => {
    const vm = buildHomeLandingViewModel({
      dashboard: {
        ...baseDashboard,
        lowRiskAutonomous24h: 3,
        pendingApprovals: 4,
        unreadEmails: 2,
      },
      supplierOverview: {
        stats: {
          totalMonitored: 5,
          activeAutoSyncs: 3,
          syncsCompletedThisMonth: 1,
          priceDropsThisMonth: 2,
          autonomousPriceAdjustments: 1,
        },
        suppliers: [],
      },
      highRiskPendingCount: 1,
    });
    expect(vm.summaryBullets[0]?.id).toBe('low-risk-auto');
    expect(vm.summaryBullets.some((b) => b.id === 'supplier-drops')).toBe(true);
    expect(vm.summaryBullets.some((b) => b.id === 'high-risk-approval')).toBe(true);
    expect(vm.showCalmFallback).toBe(false);
  });

  it('shows calm fallback when no summary signals', () => {
    const vm = buildHomeLandingViewModel({
      dashboard: baseDashboard,
      supplierOverview: null,
      highRiskPendingCount: 0,
    });
    expect(vm.summaryBullets).toHaveLength(0);
    expect(vm.showCalmFallback).toBe(true);
  });

  it('handles null dashboard gracefully', () => {
    const vm = buildHomeLandingViewModel({
      dashboard: null,
      supplierOverview: null,
      highRiskPendingCount: 0,
    });
    expect(vm.metrics).toHaveLength(3);
    expect(vm.metrics.every((m) => m.value === '—' || m.id === 'autonomous-actions')).toBe(true);
  });
});

describe('countHighRiskPendingApprovals', () => {
  it('counts only pending high-risk approvals', () => {
    const count = countHighRiskPendingApprovals([
      {
        id: '1',
        module: 'orders',
        actionType: 'refund_order',
        status: 'pending',
        createdAt: '',
        payload: {},
      },
      {
        id: '2',
        module: 'aether-mail',
        actionType: 'auto_reply',
        status: 'pending',
        createdAt: '',
        payload: {},
      },
    ]);
    expect(count).toBe(1);
  });
});

describe('getTimeGreetingKey', () => {
  it('returns morning for early hours', () => {
    expect(getTimeGreetingKey(8)).toBe('home.greeting.morning');
  });
  it('returns welcome for late night', () => {
    expect(getTimeGreetingKey(2)).toBe('home.greeting.welcome');
  });
});
