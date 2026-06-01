import { DynamicPricingEngine } from '../services/DynamicPricingEngine';
import { InventoryRepository } from '../../domain/repositories/InventoryRepository';

export class ApplyDynamicPriceUseCase {
  constructor(
    private engine: DynamicPricingEngine,
    private repo: InventoryRepository
  ) {}

  async execute(
    tenantId: string,
    productId: string,
    basePrice: number,
    reason: string = 'AUTOMATIC'
  ): Promise<number> {
    const optimalPrice = await this.engine.calculateOptimalPrice(tenantId, productId, basePrice);
    await this.engine.applyPriceChange(tenantId, productId, optimalPrice, reason);
    return optimalPrice;
  }
}
