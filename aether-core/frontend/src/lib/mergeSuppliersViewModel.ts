import { env } from '@/lib/config';
import { getSuppliersDemoSnapshot } from './suppliersPageDemo';
import type { SupplierOverviewApiResponse, SupplierOverviewStats, SuppliersViewModel } from '@/types/supplier';

const emptyStats: SupplierOverviewStats = {
  totalMonitored: 0,
  activeAutoSyncs: 0,
  syncsCompletedThisMonth: 0,
  priceDropsThisMonth: 0,
  autonomousPriceAdjustments: 0,
};

export function mergeSuppliersViewModel(
  api: SupplierOverviewApiResponse | null,
): SuppliersViewModel {
  if (env.suppliersDemo || env.isMockMode) {
    const demo = getSuppliersDemoSnapshot();
    return {
      source: 'demo',
      stats: demo.stats,
      suppliers: demo.suppliers,
    };
  }

  if (!api) {
    return {
      source: 'api',
      stats: emptyStats,
      suppliers: [],
    };
  }

  return {
    source: 'api',
    stats: api.stats,
    suppliers: api.suppliers,
  };
}
