import { InventoryRepository } from '../../domain/repositories/InventoryRepository';

export class UpdateInventoryUseCase {
  constructor(private repo: InventoryRepository) {}

  async execute(productId: string, warehouseId: string, newQuantity: number): Promise<void> {
    await this.repo.updateInventory(productId, warehouseId, newQuantity);
  }
}
