import { describe, expect, it, vi } from 'vitest';
import { mergeInsightsViewModel } from './mergeInsightsViewModel';
import { getInsightsDemoSnapshot } from './insightsPageDemo.data';
import { emptyInsightsDemoSnapshot } from './insightsPageTypes';

vi.mock('@/lib/config', () => ({
  env: { hybridDemo: true },
}));

describe('mergeInsightsViewModel', () => {
  it('uses demo metrics when no live sources', () => {
    const demo = getInsightsDemoSnapshot('30d');
    const vm = mergeInsightsViewModel({
      period: '30d',
      dashboard: null,
      outcomes: null,
      autonomy: null,
      demo,
    });
    expect(vm.revenueUplift.amount).toBe(demo.revenueUpliftAmount);
    expect(vm.sources.revenue).toBe('demo');
    expect(vm.sources.timeSaved).toBe('demo');
  });

  it('prefers live revenue uplift from outcomes report', () => {
    const vm = mergeInsightsViewModel({
      period: '30d',
      dashboard: null,
      outcomes: {
        periodDays: 30,
        totalRecords: 2,
        verifiedCount: 2,
        billableCount: 2,
        totalBillableUplift: 5200,
        records: [
          {
            id: '1',
            metric: 'Outdoor',
            baseline: 1000,
            observed: 1100,
            uplift: 100,
            confidence: 0.9,
            verificationStatus: 'verified',
            periodStart: '',
            periodEnd: '',
          },
        ],
      },
      autonomy: null,
      demo: getInsightsDemoSnapshot('30d'),
    });
    expect(vm.sources.revenue).toBe('live');
    expect(vm.sources.topCategories).toBe('live');
    expect(vm.topCategories[0]?.name).toBe('Outdoor');
  });

  it('marks time saved live only when dashboard has minutes', () => {
    const vm = mergeInsightsViewModel({
      period: '30d',
      dashboard: {
        status: 'partial',
        productCount: 0,
        lowMarginProducts: 0,
        unreadEmails: 0,
        pendingApprovals: 0,
        recentCommands: 0,
        revenueUplift30d: 0,
        timeSavedMinutes7d: 120,
      },
      outcomes: null,
      autonomy: {
        totalDecisions: 50,
        autonomousDecisions: 50,
        humanGatedDecisions: 0,
        autonomyRate: 1,
        targetMet: true,
      },
      demo: getInsightsDemoSnapshot('30d'),
    });
    expect(vm.sources.autonomousActions).toBe('live');
    expect(vm.sources.revenue).toBe('demo');
  });

  it('returns empty top categories when outcomes loaded with no records', () => {
    const vm = mergeInsightsViewModel({
      period: '30d',
      dashboard: null,
      outcomes: {
        periodDays: 30,
        totalRecords: 0,
        verifiedCount: 0,
        billableCount: 0,
        totalBillableUplift: 0,
        records: [],
      },
      autonomy: null,
      demo: getInsightsDemoSnapshot('30d'),
    });
    expect(vm.sources.topCategories).toBe('live');
    expect(vm.topCategories).toHaveLength(0);
  });

  it('uses zero metrics when hybridDemo is off and no live sources', async () => {
    vi.resetModules();
    vi.doMock('@/lib/config', () => ({
      env: { hybridDemo: false },
    }));
    const { mergeInsightsViewModel: mergeApiOnly } = await import('./mergeInsightsViewModel');
    const demo = emptyInsightsDemoSnapshot('30d');
    const vm = mergeApiOnly({
      period: '30d',
      dashboard: null,
      outcomes: null,
      autonomy: null,
      demo,
    });
    expect(vm.revenueUplift.amount).toBe(0);
    expect(vm.sources.revenue).toBe('demo');
    expect(vm.topSuppliers).toEqual([]);
    expect(vm.peakAutonomy).toEqual([]);
    vi.resetModules();
    vi.doMock('@/lib/config', () => ({
      env: { hybridDemo: true },
    }));
  });

  it('scales demo snapshot for 7d period', () => {
    const demo7 = getInsightsDemoSnapshot('7d');
    const vm = mergeInsightsViewModel({
      period: '7d',
      dashboard: null,
      outcomes: null,
      autonomy: null,
      demo: demo7,
    });
    expect(vm.periodDays).toBe(7);
    expect(vm.revenueUplift.amount).toBe(demo7.revenueUpliftAmount);
    expect(vm.autonomousActions.count).toBe(demo7.autonomousActions);
    expect(vm.peakAutonomy[0]?.valueCount).toBeGreaterThan(0);
  });
});
