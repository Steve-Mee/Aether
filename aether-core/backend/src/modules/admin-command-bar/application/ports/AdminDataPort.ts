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

export interface TopCustomerRecord {
  id: string;
  email: string;
  name: string;
  orderCount: number;
  totalSpent: number;
}

export interface OrderTrendSummary {
  recentCount: number;
  priorCount: number;
  trendPct: number;
  statusBreakdown: Record<string, number>;
}

export interface ForecastRecord {
  id: string;
  productId: string;
  prediction: string;
  confidence: number;
}

export interface RecentOrderRecord {
  id: string;
  status: string;
  total: number;
  customerId: string;
}

export interface NegotiationRecord {
  id: string;
  status: string;
  productId: string | null;
  currentOffer: number | null;
  customerAgentId: string;
  merchantAgentId: string;
}

export interface AdminDataPort {
  countProducts(tenantId: string): Promise<number>;
  countLowMarginProducts(tenantId: string, threshold?: number): Promise<number>;
  updateProductPrices(tenantId: string, percentage: number, limit?: number): Promise<number>;
  listInventoryItems(tenantId: string): Promise<Array<{ quantity: number }>>;
  listRecentOrders(tenantId: string, limit?: number): Promise<Array<{ status: string }>>;
  listRecentOrdersDetailed(tenantId: string, limit?: number): Promise<RecentOrderRecord[]>;
  countEmailsByStatus(tenantId: string, statuses: string[]): Promise<number>;
  countOutcomesByStatus(tenantId: string, status: string): Promise<number>;
  countForecasts(tenantId: string): Promise<number>;
  listForecasts(tenantId: string, limit?: number): Promise<ForecastRecord[]>;
  countPendingApprovals(tenantId: string): Promise<number>;
  listPendingApprovals(tenantId: string, modules: string[]): Promise<Array<{ id: string; payload: string; module?: string }>>;
  approveLowRisk(tenantId: string, ids: string[], actorId?: string): Promise<number>;
  createSupplier(tenantId: string, name: string, website: string): Promise<{ id: string; name: string }>;
  createProduct(
    tenantId: string,
    data: { name: string; slug: string; description?: string; price?: number; stock?: number }
  ): Promise<{ id: string; name: string; slug: string }>;
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
  countCustomers(tenantId: string): Promise<number>;
  getTopCustomers(tenantId: string, limit?: number): Promise<TopCustomerRecord[]>;
  getOrderTrends(tenantId: string, days?: number): Promise<OrderTrendSummary>;
  listActiveNegotiations(tenantId: string, limit?: number): Promise<NegotiationRecord[]>;
  getNegotiationDetail(
    tenantId: string,
    negotiationId: string
  ): Promise<(NegotiationRecord & { offers: Array<{ price: number; status: string }> }) | null>;
}

export function scopedTenant(tenantId: string | undefined, context: string): string {
  return requireTenantId(tenantId, context);
}
