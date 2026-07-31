import type { SupplierStatus } from '../../domain/entities/Supplier';

export type SupplierMonitoringLabel = 'active' | 'sync_on' | 'disabled';

export type SupplierSyncSource = 'monitor' | 'webhook' | 'auto';

export interface SupplierOverviewRow {
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

export interface SupplierOverviewStats {
  totalMonitored: number;
  activeAutoSyncs: number;
  syncsCompletedThisMonth: number;
  priceDropsThisMonth: number;
  autonomousPriceAdjustments: number;
}

export interface SupplierOverviewResponse {
  stats: SupplierOverviewStats;
  suppliers: SupplierOverviewRow[];
}

export interface SupplierChangeDetail {
  id: string;
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

export interface SupplierDetailResponse {
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
