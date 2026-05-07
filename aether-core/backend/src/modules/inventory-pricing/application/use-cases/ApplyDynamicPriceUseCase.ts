import { DynamicPricingEngine } from '../services/DynamicPricingEngine';
import { InventoryRepository } from '../../domain/repositories/InventoryRepository';

export class ApplyDynamicPriceUseCase {
  constructor(
    private engine: DynamicPricingEngine,
    private repo: InventoryRepository
  ) {}

  async execute(productId: string, basePrice: number, reason: string = 'AUTOMATIC'): Promise<number> {
    const optimalPrice = await this.engine.calculateOptimalPrice(productId, basePrice);
    await this.engine.applyPriceChange(productId, optimalPrice, reason);
    return optimalPrice;
  }
}
