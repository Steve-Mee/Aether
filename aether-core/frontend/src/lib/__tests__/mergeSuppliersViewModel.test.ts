import { describe, expect, it, vi } from 'vitest';
import { mergeSuppliersViewModel } from '../mergeSuppliersViewModel';

vi.mock('@/lib/config', () => ({
  env: { suppliersDemo: false, isMockMode: false },
}));

describe('mergeSuppliersViewModel', () => {
  it('returns empty api view when API is null in live mode', () => {
    const vm = mergeSuppliersViewModel(null);
    expect(vm.source).toBe('api');
    expect(vm.suppliers).toHaveLength(0);
    expect(vm.stats.totalMonitored).toBe(0);
  });

  it('returns api when suppliers exist', () => {
    const vm = mergeSuppliersViewModel({
      stats: {
        totalMonitored: 2,
        activeAutoSyncs: 1,
        syncsCompletedThisMonth: 4,
        priceDropsThisMonth: 0,
        autonomousPriceAdjustments: 0,
      },
      suppliers: [
        {
          id: 's1',
          name: 'A',
          website: 'https://a.test',
          supplierType: null,
          status: 'active',
          autoSyncEnabled: true,
          productCount: 1,
          lastSyncAt: null,
          lastAutoSyncAt: null,
          recentChangeCount: 0,
          hasRecentPriceDrop: false,
          hasRecentStockChange: false,
          hasRecentImportantChange: false,
          monitoringLabel: 'sync_on',
        },
      ],
    });
    expect(vm.source).toBe('api');
    expect(vm.suppliers).toHaveLength(1);
    expect(vm.suppliers[0].name).toBe('A');
  });

  it('returns api with empty suppliers when API has no suppliers (no silent demo)', () => {
    const vm = mergeSuppliersViewModel({
      stats: {
        totalMonitored: 0,
        activeAutoSyncs: 0,
        syncsCompletedThisMonth: 0,
        priceDropsThisMonth: 0,
        autonomousPriceAdjustments: 0,
      },
      suppliers: [],
    });
    expect(vm.source).toBe('api');
    expect(vm.suppliers).toHaveLength(0);
  });
});
