import { prisma } from '../../../../shared/prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { SupplierChangePort } from '../../application/ports/SupplierChangePort';

export class PrismaSupplierChangeAdapter implements SupplierChangePort {
  async recordChange(data: {
    tenantId: string;
    supplierId: string;
    changeType: string;
    payload: string;
    status: string;
  }): Promise<void> {
    const tenantId = requireTenantId(data.tenantId, 'SupplierChange.record');
    await prisma.supplierChange.create({
      data: {
        tenantId,
        supplierId: data.supplierId,
        changeType: data.changeType,
        payload: data.payload,
        status: data.status,
      },
    });
  }

  async applyPendingChanges(
    tenantId: string,
    supplierId: string,
    changeHint?: Record<string, unknown>
  ): Promise<number> {
    const tid = requireTenantId(tenantId, 'SupplierChange.applyPendingChanges');
    let applied = 0;

    if (changeHint?.sku) {
      applied += await this.applyOneChange(tid, supplierId, changeHint);
    }

    const pending = await prisma.supplierChange.findMany({
      where: { tenantId: tid, supplierId, status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });

    for (const row of pending) {
      const parsed = JSON.parse(row.payload) as Record<string, unknown>;
      const change = (parsed.change as Record<string, unknown>) ?? parsed;
      applied += await this.applyOneChange(tid, supplierId, {
        type: row.changeType,
        ...change,
      });
      await prisma.supplierChange.update({
        where: { id: row.id },
        data: { status: 'applied' },
      });
    }

    return applied;
  }

  private async applyOneChange(
    tenantId: string,
    supplierId: string,
    change: Record<string, unknown>
  ): Promise<number> {
    const type = String(change.type ?? change.changeType ?? '');
    const sku = String(change.sku ?? '');
    if (!sku) return 0;

    if (type === 'price_change' || type === 'new_product') {
      const newPrice = Number(change.newPrice ?? change.price ?? 0);
      const name = String(change.name ?? sku);
      const stock = Number(change.stock ?? 0);

      await prisma.supplierProduct.upsert({
        where: { supplierId_sku: { supplierId, sku } },
        update: {
          currentPrice: newPrice > 0 ? newPrice : undefined,
          name,
          stock: stock > 0 ? stock : undefined,
          lastUpdated: new Date(),
        },
        create: {
          supplierId,
          sku,
          name,
          currentPrice: newPrice > 0 ? newPrice : 0,
          stock: stock > 0 ? stock : 0,
        },
      });

      if (newPrice > 0) {
        const variant = await prisma.productVariant.findFirst({
          where: { sku, product: { tenantId } },
          include: { product: true },
        });
        if (variant) {
          await prisma.productVariant.update({
            where: { id: variant.id },
            data: { price: newPrice },
          });
          await prisma.product.update({
            where: { id: variant.productId },
            data: { price: newPrice },
          });
        }
      }

      return 1;
    }

    return 0;
  }
}
