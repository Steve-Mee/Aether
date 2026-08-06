import { PrismaClient } from '@prisma/client';
import type {
  ChannelCatalogPort,
  ChannelSyncLogPort,
  UpsertChannelOrderInput,
  UpsertChannelProductInput,
} from '../../application/ports/ChannelCatalogPort';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

function channelProductSlug(provider: string, externalId: string): string {
  const safe = externalId.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  return `ch-${provider}-${safe}`.slice(0, 180);
}

function splitCustomerName(name?: string): { firstName?: string; lastName?: string } {
  if (!name?.trim()) return {};
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export class PrismaChannelCatalogAdapter implements ChannelCatalogPort, ChannelSyncLogPort {
  constructor(private prisma: PrismaClient) {}

  async upsertProduct(input: UpsertChannelProductInput): Promise<{ nativeId: string; created: boolean }> {
    const tid = requireTenantId(input.tenantId, 'PrismaChannelCatalogAdapter.upsertProduct');
    const slug = channelProductSlug(input.provider, input.product.externalId);

    const existingRef = await this.prisma.channelExternalRef.findUnique({
      where: {
        connectionId_entityType_externalId: {
          connectionId: input.connectionId,
          entityType: 'product',
          externalId: input.product.externalId,
        },
      },
    });

    if (existingRef) {
      await this.prisma.product.update({
        where: { id: existingRef.nativeId },
        data: {
          name: input.product.name,
          description: input.product.description ?? null,
          price: input.product.price,
          stock: input.product.stock ?? 0,
          status: 'active',
        },
      });
      return { nativeId: existingRef.nativeId, created: false };
    }

    const bySlug = await this.prisma.product.findUnique({
      where: { tenantId_slug: { tenantId: tid, slug } },
    });

    if (bySlug) {
      await this.prisma.channelExternalRef.create({
        data: {
          tenantId: tid,
          connectionId: input.connectionId,
          entityType: 'product',
          externalId: input.product.externalId,
          nativeId: bySlug.id,
        },
      });
      await this.prisma.product.update({
        where: { id: bySlug.id },
        data: {
          name: input.product.name,
          description: input.product.description ?? null,
          price: input.product.price,
          stock: input.product.stock ?? 0,
        },
      });
      return { nativeId: bySlug.id, created: false };
    }

    const created = await this.prisma.product.create({
      data: {
        tenantId: tid,
        name: input.product.name,
        description: input.product.description ?? null,
        slug,
        price: input.product.price,
        stock: input.product.stock ?? 0,
        status: 'active',
      },
    });

    await this.prisma.channelExternalRef.create({
      data: {
        tenantId: tid,
        connectionId: input.connectionId,
        entityType: 'product',
        externalId: input.product.externalId,
        nativeId: created.id,
      },
    });

    if (input.product.sku) {
      await this.prisma.productVariant.create({
        data: {
          productId: created.id,
          sku: input.product.sku,
          price: input.product.price,
          currency: input.product.currency,
          stock: input.product.stock ?? 0,
        },
      });
    }

    return { nativeId: created.id, created: true };
  }

  async upsertOrder(input: UpsertChannelOrderInput): Promise<{ nativeId: string; created: boolean }> {
    const tid = requireTenantId(input.tenantId, 'PrismaChannelCatalogAdapter.upsertOrder');

    const existingRef = await this.prisma.channelExternalRef.findUnique({
      where: {
        connectionId_entityType_externalId: {
          connectionId: input.connectionId,
          entityType: 'order',
          externalId: input.order.externalId,
        },
      },
    });

    if (existingRef) {
      await this.prisma.order.update({
        where: { id: existingRef.nativeId },
        data: {
          status: input.order.status,
          total: input.order.total,
          currency: input.order.currency,
        },
      });
      return { nativeId: existingRef.nativeId, created: false };
    }

    const email =
      input.order.customerEmail?.trim() ||
      `channel-order-${input.order.externalId}@import.local`;
    const { firstName, lastName } = splitCustomerName(input.order.customerName);

    const customer = await this.prisma.customer.upsert({
      where: { tenantId_email: { tenantId: tid, email } },
      create: {
        tenantId: tid,
        email,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
      },
      update: {
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
      },
    });

    const itemRows: Array<{ productId: string; quantity: number; price: number }> = [];
    for (const item of input.order.items) {
      const productRef = await this.prisma.channelExternalRef.findUnique({
        where: {
          connectionId_entityType_externalId: {
            connectionId: input.connectionId,
            entityType: 'product',
            externalId: item.productExternalId,
          },
        },
      });
      if (!productRef) continue;
      itemRows.push({
        productId: productRef.nativeId,
        quantity: item.quantity,
        price: item.price,
      });
    }

    if (itemRows.length === 0) {
      throw new Error(
        `Order ${input.order.externalId} has no mapped products — sync products first`
      );
    }

    const order = await this.prisma.order.create({
      data: {
        tenantId: tid,
        customerId: customer.id,
        status: input.order.status,
        total: input.order.total,
        currency: input.order.currency,
        createdAt: input.order.createdAt,
        items: { create: itemRows },
      },
    });

    await this.prisma.channelExternalRef.create({
      data: {
        tenantId: tid,
        connectionId: input.connectionId,
        entityType: 'order',
        externalId: input.order.externalId,
        nativeId: order.id,
      },
    });

    return { nativeId: order.id, created: true };
  }

  async log(entry: {
    connectionId: string;
    tenantId: string;
    syncType: string;
    status: string;
    itemsCount: number;
    errorMessage?: string;
  }): Promise<void> {
    const tid = requireTenantId(entry.tenantId, 'PrismaChannelCatalogAdapter.log');
    await this.prisma.channelSyncLog.create({
      data: {
        connectionId: entry.connectionId,
        tenantId: tid,
        syncType: entry.syncType,
        status: entry.status,
        itemsCount: entry.itemsCount,
        errorMessage: entry.errorMessage,
      },
    });
  }
}
