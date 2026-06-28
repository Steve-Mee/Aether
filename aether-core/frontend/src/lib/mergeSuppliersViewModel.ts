import { env } from '@/lib/config';
import { getSuppliersDemoSnapshot } from './suppliersPageDemo';
import type { SupplierOverviewApiResponse, SuppliersViewModel } from '@/types/supplier';

const demoMode = env.suppliersDemo;

export function mergeSuppliersViewModel(
  api: SupplierOverviewApiResponse | null,
): SuppliersViewModel {
  const demo = getSuppliersDemoSnapshot();

  if (demoMode || !api || api.suppliers.length === 0) {
    return {
      source: 'demo',
      stats: demo.stats,
      suppliers: demo.suppliers,
    };
  }

  return {
    source: 'api',
    stats: api.stats,
    suppliers: api.suppliers,
  };
}
