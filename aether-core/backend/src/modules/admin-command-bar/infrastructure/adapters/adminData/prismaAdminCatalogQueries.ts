import { prisma } from '../../../../../shared/prisma/client';
import { requireTenantId } from '../../../../../shared/tenant/tenantContext';
import {
  BrainProductRecord,
  ForecastRecord,
  NegotiationRecord,
  RestockUpdateItem,
} from '../../../application/ports/AdminDataPort';

export async function countProducts(tenantId: string): Promise<number> {
  const tid = requireTenantId(tenantId, 'AdminData.countProducts');
  return prisma.product.count({ where: { tenantId: tid } });
}

export async function countLowMarginProducts(tenantId: string, threshold = 25): Promise<number> {
  const tid = requireTenantId(tenantId, 'AdminData.countLowMarginProducts');
  return prisma.product.count({ where: { tenantId: tid, price: { lt: threshold } } });
}

export async function updateProductPrices(tenantId: string, percentage: number, limit = 50): Promise<number> {
  const tid = requireTenantId(tenantId, 'AdminData.updateProductPrices');
  const products = await prisma.product.findMany({ where: { tenantId: tid }, take: limit });
  let updated = 0;
  for (const p of products) {
    await prisma.product.update({
      where: { id: p.id },
      data: { price: p.price * (1 + percentage / 100) },
    });
    updated += 1;
  }
  return updated;
}

export async function listInventoryItems(tenantId: string) {
  const tid = requireTenantId(tenantId, 'AdminData.listInventoryItems');
  return prisma.inventoryItem.findMany({ where: { tenantId: tid } });
}

export async function countForecasts(tenantId: string) {
  const tid = requireTenantId(tenantId, 'AdminData.countForecasts');
  return prisma.forecast.count({ where: { tenantId: tid } });
}

export async function listForecasts(tenantId: string, limit = 20): Promise<ForecastRecord[]> {
  const tid = requireTenantId(tenantId, 'AdminData.listForecasts');
  const rows = await prisma.forecast.findMany({
    where: { tenantId: tid },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 50),
    select: { id: true, productId: true, prediction: true, confidence: true },
  });
  return rows;
}

export async function createSupplier(tenantId: string, name: string, website: string) {
  const tid = requireTenantId(tenantId, 'AdminData.createSupplier');
  return prisma.supplier.create({ data: { tenantId: tid, name, website } });
}

export async function createProduct(
  tenantId: string,
  data: { name: string; slug: string; description?: string; price?: number; stock?: number }
) {
  const tid = requireTenantId(tenantId, 'AdminData.createProduct');
  const product = await prisma.product.create({
    data: {
      tenantId: tid,
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      price: data.price ?? 0,
      stock: data.stock ?? 0,
      status: 'active',
    },
  });
  return { id: product.id, name: product.name, slug: product.slug };
}

export async function listSuppliers(tenantId: string, limit = 5) {
  const tid = requireTenantId(tenantId, 'AdminData.listSuppliers');
  return prisma.supplier.findMany({ where: { tenantId: tid }, take: limit });
}

export async function listLowStockInventory(tenantId: string, threshold = 10) {
  const tid = requireTenantId(tenantId, 'AdminData.listLowStockInventory');
  return prisma.inventoryItem.findMany({
    where: { tenantId: tid, quantity: { lt: threshold } },
  });
}

export async function listProductsForBrain(tenantId: string, limit = 200): Promise<BrainProductRecord[]> {
  const tid = requireTenantId(tenantId, 'AdminData.listProductsForBrain');
  return prisma.product.findMany({
    where: { tenantId: tid, status: 'active' },
    take: limit,
    select: { id: true, name: true, price: true, stock: true, slug: true, description: true },
  });
}

export async function searchProductsByName(
  tenantId: string,
  query: string,
  limit = 5
): Promise<BrainProductRecord[]> {
  const tid = requireTenantId(tenantId, 'AdminData.searchProductsByName');
  const trimmed = query.trim();
  if (!trimmed) return [];

  return prisma.product.findMany({
    where: {
      tenantId: tid,
      status: 'active',
      OR: [
        { name: { contains: trimmed, mode: 'insensitive' } },
        { slug: { contains: trimmed, mode: 'insensitive' } },
        { description: { contains: trimmed, mode: 'insensitive' } },
      ],
    },
    take: limit,
    select: { id: true, name: true, price: true, stock: true, slug: true, description: true },
  });
}

export async function updateProductPricesByIds(
  tenantId: string,
  productIds: string[],
  percentage: number
): Promise<number> {
  const tid = requireTenantId(tenantId, 'AdminData.updateProductPricesByIds');
  if (productIds.length === 0) return 0;

  const products = await prisma.product.findMany({
    where: { tenantId: tid, id: { in: productIds } },
  });
  let updated = 0;
  for (const p of products) {
    await prisma.product.update({
      where: { id: p.id },
      data: { price: p.price * (1 + percentage / 100) },
    });
    updated += 1;
  }
  return updated;
}

export async function restoreProductPrices(
  tenantId: string,
  restores: Array<{ id: string; price: number }>
): Promise<number> {
  const tid = requireTenantId(tenantId, 'AdminData.restoreProductPrices');
  let restored = 0;
  for (const item of restores) {
    const product = await prisma.product.findFirst({ where: { tenantId: tid, id: item.id } });
    if (!product) continue;
    await prisma.product.update({ where: { id: product.id }, data: { price: item.price } });
    restored += 1;
  }
  return restored;
}

export async function applyRestockUpdates(tenantId: string, items: RestockUpdateItem[]): Promise<number> {
  const tid = requireTenantId(tenantId, 'AdminData.applyRestockUpdates');
  let updated = 0;
  for (const item of items) {
    const row = await prisma.inventoryItem.findFirst({
      where: { tenantId: tid, id: item.id, productId: item.productId },
    });
    if (!row) continue;
    await prisma.inventoryItem.update({
      where: { id: row.id },
      data: { quantity: item.suggestedQty },
    });
    updated += 1;
  }
  return updated;
}

export async function listActiveNegotiations(tenantId: string, limit = 20): Promise<NegotiationRecord[]> {
  const tid = requireTenantId(tenantId, 'AdminData.listActiveNegotiations');
  const rows = await prisma.negotiation.findMany({
    where: { tenantId: tid, status: { in: ['active', 'IN_PROGRESS', 'counter'] } },
    orderBy: { updatedAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 50),
    select: {
      id: true,
      status: true,
      productId: true,
      currentOffer: true,
      customerAgentId: true,
      merchantAgentId: true,
    },
  });
  return rows;
}

export async function getNegotiationDetail(tenantId: string, negotiationId: string) {
  const tid = requireTenantId(tenantId, 'AdminData.getNegotiationDetail');
  const row = await prisma.negotiation.findFirst({
    where: { tenantId: tid, id: negotiationId },
    include: {
      offers: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { price: true, status: true },
      },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    productId: row.productId,
    currentOffer: row.currentOffer,
    customerAgentId: row.customerAgentId,
    merchantAgentId: row.merchantAgentId,
    offers: row.offers,
  };
}
