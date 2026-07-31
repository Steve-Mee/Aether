import { prisma } from '../../../../../shared/prisma/client';
import { requireTenantId } from '../../../../../shared/tenant/tenantContext';
import {
  CategoryRevenueMetrics,
  InventoryCostSummary,
  MarginMetrics,
} from '../../../application/ports/AdminDataPort';

export async function getMarginMetrics(tenantId: string, threshold = 25): Promise<MarginMetrics> {
  const tid = requireTenantId(tenantId, 'AdminData.getMarginMetrics');
  const [totalProducts, lowMarginCount] = await Promise.all([
    prisma.product.count({ where: { tenantId: tid, status: 'active' } }),
    prisma.product.count({ where: { tenantId: tid, status: 'active', price: { lt: threshold } } }),
  ]);
  const marginPct =
    totalProducts === 0
      ? 0
      : Math.round(((totalProducts - lowMarginCount) / totalProducts) * 1000) / 10;
  return { lowMarginCount, totalProducts, marginPct };
}

export async function getCategoryRevenue(
  tenantId: string,
  categoryId: string,
  days = 30
): Promise<CategoryRevenueMetrics> {
  const tid = requireTenantId(tenantId, 'AdminData.getCategoryRevenue');
  const windowDays = Math.min(Math.max(days, 7), 90);
  const since = new Date(Date.now() - windowDays * 86_400_000);
  const priorSince = new Date(Date.now() - windowDays * 2 * 86_400_000);

  const products = await prisma.product.findMany({
    where: {
      tenantId: tid,
      OR: [
        { id: categoryId },
        { slug: categoryId },
        { slug: { contains: categoryId, mode: 'insensitive' } },
        { name: { contains: categoryId, mode: 'insensitive' } },
      ],
    },
    select: { id: true },
  });
  const productIds = products.map((p) => p.id);
  if (productIds.length === 0) {
    return { categoryId, revenue: 0, orderCount: 0, trendPct: 0 };
  }

  const [recentItems, priorItems] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        productId: { in: productIds },
        order: { tenantId: tid, createdAt: { gte: since } },
      },
      select: { quantity: true, price: true, orderId: true },
    }),
    prisma.orderItem.findMany({
      where: {
        productId: { in: productIds },
        order: { tenantId: tid, createdAt: { gte: priorSince, lt: since } },
      },
      select: { quantity: true, price: true, orderId: true },
    }),
  ]);

  const sumRevenue = (items: Array<{ quantity: number; price: number }>) =>
    items.reduce((sum, i) => sum + i.quantity * i.price, 0);

  const revenue = Math.round(sumRevenue(recentItems) * 100) / 100;
  const priorRevenue = sumRevenue(priorItems);
  const orderCount = new Set(recentItems.map((i) => i.orderId)).size;
  const trendPct =
    priorRevenue === 0
      ? revenue > 0
        ? 100
        : 0
      : Math.round(((revenue - priorRevenue) / priorRevenue) * 1000) / 10;

  return { categoryId, revenue, orderCount, trendPct };
}

export async function getInventoryCostSummary(
  tenantId: string,
  lowStockThreshold = 10
): Promise<InventoryCostSummary> {
  const tid = requireTenantId(tenantId, 'AdminData.getInventoryCostSummary');
  const items = await prisma.inventoryItem.findMany({
    where: { tenantId: tid },
    select: { quantity: true },
  });
  const lowStockCount = items.filter((i) => i.quantity < lowStockThreshold).length;
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  return { lowStockCount, totalSkus: items.length, totalQuantity };
}
