import { Inventory } from '../entities/Inventory';
import { PricingRule } from '../entities/PricingRule';
import { PriceAdjustment } from '../entities/PriceAdjustment';

export type InventoryRow = {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
};

export type ProductNameSlug = {
  id: string;
  name: string;
  slug: string;
};

export interface InventoryRepository {
  getInventoryByProduct(tenantId: string, productId: string): Promise<Inventory[]>;
  listInventoryItems(tenantId: string): Promise<InventoryRow[]>;
  listProductsByIds(tenantId: string, productIds: string[]): Promise<ProductNameSlug[]>;
  updateInventory(
    tenantId: string,
    productId: string,
    warehouseId: string,
    quantity: number
  ): Promise<void>;
  getPricingRule(tenantId: string, productId: string): Promise<PricingRule | null>;
  savePricingRule(tenantId: string, rule: PricingRule): Promise<void>;
  logPriceAdjustment(tenantId: string, adjustment: PriceAdjustment): Promise<void>;
}
