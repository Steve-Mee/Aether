import { InventoryRepository } from '../../domain/repositories/InventoryRepository';
import { PricingRule } from '../../domain/entities/PricingRule';
import { PriceAdjustment } from '../../domain/entities/PriceAdjustment';

export class DynamicPricingEngine {
  constructor(private repo: InventoryRepository) {}

  async calculateOptimalPrice(tenantId: string, productId: string, basePrice: number): Promise<number> {
    const rule = await this.repo.getPricingRule(tenantId, productId);
    if (!rule || !rule.isActive) return basePrice;

    let price = basePrice;

    // Margin-based pricing
    if (rule.strategy === 'MARGIN_BASED' || rule.strategy === 'DEMAND_BASED') {
      const margin = (price - (price * 0.6)) / price; // Assume 60% cost
      if (margin < rule.minMargin) {
        price = price / (1 - rule.minMargin);
      }
    }

    // Competitor adjustment
    if (rule.competitorAdjustment !== 0) {
      price = price * (1 + rule.competitorAdjustment);
    }

    // Demand multiplier
    price = price * rule.demandMultiplier;

    return Math.round(price * 100) / 100;
  }

  async applyPriceChange(
    tenantId: string,
    productId: string,
    newPrice: number,
    reason: string
  ): Promise<void> {
    const adjustment = new PriceAdjustment(
      crypto.randomUUID(),
      productId,
      0,
      newPrice,
      reason,
      new Date(),
      'SYSTEM'
    );

    await this.repo.logPriceAdjustment(tenantId, adjustment);
  }
}
