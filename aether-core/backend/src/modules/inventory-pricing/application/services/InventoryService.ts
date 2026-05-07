import { InventoryRepository } from '../../domain/repositories/InventoryRepository';
import { Inventory } from '../../domain/entities/Inventory';

export class InventoryService {
  constructor(private repo: InventoryRepository) {}

  async getAvailableStock(productId: string): Promise<number> {
    const inventories = await this.repo.getInventoryByProduct(productId);
    return inventories.reduce((sum, inv) => sum + inv.available, 0);
  }

  async reserveStock(productId: string, quantity: number): Promise<boolean> {
    // Simplified reservation logic
    const inventories = await this.repo.getInventoryByProduct(productId);
    const totalAvailable = inventories.reduce((sum, inv) => sum + inv.available, 0);
    
    if (totalAvailable < quantity) return false;

    // In real implementation: distribute reservation across warehouses
    return true;
  }
}
