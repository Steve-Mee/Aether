import { describe, expect, it } from 'vitest';
import { mergeSuppliersViewModel } from '../mergeSuppliersViewModel';

describe('mergeSuppliersViewModel', () => {
  it('returns demo when API is empty', () => {
    const vm = mergeSuppliersViewModel(null);
    expect(vm.source).toBe('demo');
    expect(vm.suppliers.length).toBeGreaterThanOrEqual(5);
    expect(vm.stats.syncsCompletedThisMonth).toBeGreaterThan(0);
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
});
