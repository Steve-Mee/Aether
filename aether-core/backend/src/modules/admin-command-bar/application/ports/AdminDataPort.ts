import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export interface BrainProductRecord {
  id: string;
  name: string;
  price: number;
  stock: number;
  slug: string;
  description?: string | null;
}

export interface RestockUpdateItem {
  id: string;
  productId: string;
  warehouseId: string;
  currentQty: number;
  suggestedQty: number;
}

export interface AdminDataPort {
  countProducts(tenantId: string): Promise<number>;
  countLowMarginProducts(tenantId: string, threshold?: number): Promise<number>;
  updateProductPrices(tenantId: string, percentage: number, limit?: number): Promise<number>;
  listInventoryItems(tenantId: string): Promise<Array<{ quantity: number }>>;
  listRecentOrders(tenantId: string, limit?: number): Promise<Array<{ status: string }>>;
  countEmailsByStatus(tenantId: string, statuses: string[]): Promise<number>;
  countOutcomesByStatus(tenantId: string, status: string): Promise<number>;
  countForecasts(tenantId: string): Promise<number>;
  countPendingApprovals(tenantId: string): Promise<number>;
  listPendingApprovals(tenantId: string, modules: string[]): Promise<Array<{ id: string; payload: string }>>;
  approveLowRisk(tenantId: string, ids: string[], actorId?: string): Promise<number>;
  createSupplier(tenantId: string, name: string, website: string): Promise<{ id: string; name: string }>;
  listSuppliers(tenantId: string, limit?: number): Promise<Array<{ id: string }>>;
  findLatestProposedOutcome(tenantId: string): Promise<{
    id: string;
    metric: string;
    confidence: number;
  } | null>;
  countRecentCommands(tenantId: string, daysSince?: number): Promise<number>;
  listLowStockInventory(tenantId: string, threshold?: number): Promise<
    Array<{ id: string; productId: string; quantity: number; warehouseId: string }>
  >;
  listProductsForBrain(tenantId: string, limit?: number): Promise<BrainProductRecord[]>;
  searchProductsByName(tenantId: string, query: string, limit?: number): Promise<BrainProductRecord[]>;
  updateProductPricesByIds(tenantId: string, productIds: string[], percentage: number): Promise<number>;
  restoreProductPrices(tenantId: string, restores: Array<{ id: string; price: number }>): Promise<number>;
  applyRestockUpdates(tenantId: string, items: RestockUpdateItem[]): Promise<number>;
}

export function scopedTenant(tenantId: string | undefined, context: string): string {
  return requireTenantId(tenantId, context);
}
