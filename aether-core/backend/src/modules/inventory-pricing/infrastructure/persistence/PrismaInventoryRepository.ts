import { PrismaClient } from '@prisma/client';
import { InventoryRepository } from '../../domain/repositories/InventoryRepository';
import { Inventory } from '../../domain/entities/Inventory';
import { PricingRule } from '../../domain/entities/PricingRule';
import { PriceAdjustment } from '../../domain/entities/PriceAdjustment';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class PrismaInventoryRepository implements InventoryRepository {
  constructor(private prisma: PrismaClient) {}

  async getInventoryByProduct(tenantId: string, productId: string): Promise<Inventory[]> {
    const tid = requireTenantId(tenantId, 'PrismaInventoryRepository.getInventoryByProduct');
    const rows = await this.prisma.inventoryItem.findMany({
      where: { tenantId: tid, productId },
    });
    return rows.map(
      (r) => new Inventory(r.id, r.productId, r.warehouseId, r.quantity, 0, new Date())
    );
  }

  async updateInventory(
    tenantId: string,
    productId: string,
    warehouseId: string,
    quantity: number
  ): Promise<void> {
    const tid = requireTenantId(tenantId, 'PrismaInventoryRepository.updateInventory');
    await this.prisma.inventoryItem.upsert({
      where: { tenantId_productId_warehouseId: { tenantId: tid, productId, warehouseId } },
      create: { tenantId: tid, productId, warehouseId, quantity },
      update: { quantity },
    });
    await this.prisma.product.updateMany({
      where: { id: productId, tenantId: tid },
      data: { stock: quantity },
    });
  }

  async getPricingRule(tenantId: string, productId: string): Promise<PricingRule | null> {
    const tid = requireTenantId(tenantId, 'PrismaInventoryRepository.getPricingRule');
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: tid },
    });
    if (!product) return null;
    return new PricingRule(`rule_${productId}`, productId, 'FIXED', 0.1, 0.5);
  }

  async savePricingRule(tenantId: string, rule: PricingRule): Promise<void> {
    const tid = requireTenantId(tenantId, 'PrismaInventoryRepository.savePricingRule');
    const product = await this.prisma.product.findFirst({
      where: { id: rule.productId, tenantId: tid },
    });
    if (!product) return;
    const price = product.price * (1 + rule.minMargin);
    await this.prisma.product.update({
      where: { id: rule.productId },
      data: { price },
    });
  }

  async logPriceAdjustment(tenantId: string, adjustment: PriceAdjustment): Promise<void> {
    const tid = requireTenantId(tenantId, 'PrismaInventoryRepository.logPriceAdjustment');
    await this.prisma.auditLog.create({
      data: {
        tenantId: tid,
        module: 'inventory-pricing',
        action: 'price_adjusted',
        details: JSON.stringify(adjustment),
      },
    });
  }
}
