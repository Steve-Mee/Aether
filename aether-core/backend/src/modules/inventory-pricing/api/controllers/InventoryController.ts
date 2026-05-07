import { Request, Response } from 'express';
import { UpdateInventoryUseCase } from '../../application/use-cases/UpdateInventoryUseCase';
import { ApplyDynamicPriceUseCase } from '../../application/use-cases/ApplyDynamicPriceUseCase';
import { DynamicPricingEngine } from '../../application/services/DynamicPricingEngine';
import { PrismaInventoryRepository } from '../../infrastructure/persistence/PrismaInventoryRepository';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const repo = new PrismaInventoryRepository(prisma);
const pricingEngine = new DynamicPricingEngine(repo);
const updateInventoryUC = new UpdateInventoryUseCase(repo);
const applyPriceUC = new ApplyDynamicPriceUseCase(pricingEngine, repo);

export class InventoryController {
  async updateStock(req: Request, res: Response) {
    const { productId, warehouseId, quantity } = req.body;
    await updateInventoryUC.execute(productId, warehouseId, quantity);
    res.json({ success: true, message: 'Inventory updated' });
  }

  async applyDynamicPrice(req: Request, res: Response) {
    const { productId, basePrice, reason } = req.body;
    const newPrice = await applyPriceUC.execute(productId, basePrice, reason);
    res.json({ success: true, newPrice });
  }

  async getLowStock(req: Request, res: Response) {
    // Placeholder
    res.json({ lowStockProducts: [] });
  }
}
