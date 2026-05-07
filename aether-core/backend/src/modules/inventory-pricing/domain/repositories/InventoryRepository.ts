import { Inventory } from '../entities/Inventory';
import { PricingRule } from '../entities/PricingRule';
import { PriceAdjustment } from '../entities/PriceAdjustment';

export interface InventoryRepository {
  getInventoryByProduct(productId: string): Promise<Inventory[]>;
  updateInventory(productId: string, warehouseId: string, quantity: number): Promise<void>;
  getPricingRule(productId: string): Promise<PricingRule | null>;
  savePricingRule(rule: PricingRule): Promise<void>;
  logPriceAdjustment(adjustment: PriceAdjustment): Promise<void>;
}
