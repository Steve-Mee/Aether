/**
 * Supplier intelligence types.
 * @see GET /api/suppliers/overview, GET /api/suppliers/:id, GET /api/suppliers/changes
 */

export type SupplierStatusTab = 'all' | 'active' | 'inactive' | 'recent';

export type SupplierMonitoringLabel = 'active' | 'sync_on' | 'disabled';

export type SupplierStatus = 'active' | 'inactive' | 'disabled';

export type SupplierSyncSource = 'monitor' | 'webhook' | 'auto';

export interface SupplierOverviewStats {
  totalMonitored: number;
  activeAutoSyncs: number;
  syncsCompletedThisMonth: number;
  priceDropsThisMonth: number;
  autonomousPriceAdjustments: number;
}

export interface SupplierListItem {
  id: string;
  name: string;
  website: string;
  supplierType: string | null;
  status: SupplierStatus;
  autoSyncEnabled: boolean;
  productCount: number;
  lastSyncAt: string | null;
  lastAutoSyncAt: string | null;
  recentChangeCount: number;
  hasRecentPriceDrop: boolean;
  hasRecentStockChange: boolean;
  hasRecentImportantChange: boolean;
  monitoringLabel: SupplierMonitoringLabel;
}

export interface SupplierChangeDetail {
  id: string;
  changeType: string;
  payload: Record<string, unknown>;
  status: string;
  createdAt: string;
}

/** Row from GET /api/suppliers/changes */
export interface SupplierChangeRow {
  id: string;
  tenantId: string;
  supplierId: string;
  changeType: string;
  payload: Record<string, unknown>;
  status: string;
  createdAt: string;
}

export interface SupplierProductDetail {
  id: string;
  sku: string;
  name: string;
  currentPrice: number;
  stock: number;
  lastUpdated: string;
}

export interface SupplierSyncHistoryItem {
  id: string;
  at: string;
  source: SupplierSyncSource;
  actor: string | null;
  label: string;
  productsFound?: number;
  changeCount?: number;
}

export interface SupplierDetail {
  id: string;
  name: string;
  website: string;
  supplierType: string | null;
  status: SupplierStatus;
  autoSyncEnabled: boolean;
  productCount: number;
  lastSyncAt: string | null;
  lastAutoSyncAt: string | null;
  recentChanges: SupplierChangeDetail[];
  recentProducts: SupplierProductDetail[];
  recentSyncs: SupplierSyncHistoryItem[];
}

export interface SupplierOverviewApiResponse {
  stats: SupplierOverviewStats;
  suppliers: SupplierListItem[];
}

export type SuppliersViewSource = 'api' | 'demo';

export interface SuppliersViewModel {
  source: SuppliersViewSource;
  stats: SupplierOverviewStats;
  suppliers: SupplierListItem[];
}
