import { prisma } from '../../../../shared/prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { eventBus } from '../../../../shared/events/eventBus';

export interface SupplierWebhookProduct {
  sku: string;
  name: string;
  price: number;
  stock?: number;
}

export class SupplierWebhookAdapter {
  async handleWebhook(
    tenantId: string,
    supplierId: string | undefined,
    products: SupplierWebhookProduct[]
  ): Promise<{ eventId: string; productsReceived: number }> {
    const tid = requireTenantId(tenantId, 'SupplierWebhook.handle');

    const event = await prisma.supplierWebhookEvent.create({
      data: {
        tenantId: tid,
        supplierId,
        payload: JSON.stringify(products),
        status: 'received',
      },
    });

    if (supplierId) {
      for (const p of products) {
        await prisma.supplierProduct.upsert({
          where: { supplierId_sku: { supplierId, sku: p.sku } },
          create: {
            supplierId,
            name: p.name,
            sku: p.sku,
            currentPrice: p.price,
            stock: p.stock ?? 0,
          },
          update: {
            name: p.name,
            currentPrice: p.price,
            stock: p.stock ?? 0,
            lastUpdated: new Date(),
          },
        });
      }
    }

    await eventBus.publish({
      tenantId: tid,
      type: 'supplier.sync_completed',
      payload: { source: 'webhook', productCount: products.length, eventId: event.id },
      idempotencyKey: `supplier.webhook:${event.id}`,
    });

    return { eventId: event.id, productsReceived: products.length };
  }
}
