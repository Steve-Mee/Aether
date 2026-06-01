import { InventoryRepository } from '../../domain/repositories/InventoryRepository';
import { Inventory } from '../../domain/entities/Inventory';

export class InventoryService {
  constructor(private repo: InventoryRepository) {}

  async getAvailableStock(tenantId: string, productId: string): Promise<number> {
    const inventories = await this.repo.getInventoryByProduct(tenantId, productId);
    return inventories.reduce((sum, inv) => sum + inv.available, 0);
  }

  async reserveStock(tenantId: string, productId: string, quantity: number): Promise<boolean> {
    const inventories = await this.repo.getInventoryByProduct(tenantId, productId);
    const totalAvailable = inventories.reduce((sum, inv) => sum + inv.available, 0);
    
    if (totalAvailable < quantity) return false;

    // In real implementation: distribute reservation across warehouses
    return true;
  }
}
