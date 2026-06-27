import { prisma } from '../../../../shared/prisma/client';
import {
  AdminDataPort,
  BrainProductRecord,
  ForecastRecord,
  NegotiationRecord,
  OrderTrendSummary,
  RecentOrderRecord,
  RestockUpdateItem,
  TopCustomerRecord,
} from '../../application/ports/AdminDataPort';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class PrismaAdminDataAdapter implements AdminDataPort {
  async countProducts(tenantId: string): Promise<number> {
    const tid = requireTenantId(tenantId, 'AdminData.countProducts');
    return prisma.product.count({ where: { tenantId: tid } });
  }

  async countLowMarginProducts(tenantId: string, threshold = 25): Promise<number> {
    const tid = requireTenantId(tenantId, 'AdminData.countLowMarginProducts');
    return prisma.product.count({ where: { tenantId: tid, price: { lt: threshold } } });
  }

  async updateProductPrices(tenantId: string, percentage: number, limit = 50): Promise<number> {
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

  async listInventoryItems(tenantId: string) {
    const tid = requireTenantId(tenantId, 'AdminData.listInventoryItems');
    return prisma.inventoryItem.findMany({ where: { tenantId: tid } });
  }

  async listRecentOrders(tenantId: string, limit = 10) {
    const detailed = await this.listRecentOrdersDetailed(tenantId, limit);
    return detailed.map((o) => ({ status: o.status }));
  }

  async listRecentOrdersDetailed(tenantId: string, limit = 10): Promise<RecentOrderRecord[]> {
    const tid = requireTenantId(tenantId, 'AdminData.listRecentOrdersDetailed');
    const orders = await prisma.order.findMany({
      where: { tenantId: tid },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 50),
      select: { id: true, status: true, total: true, customerId: true },
    });
    return orders;
  }

  async countEmailsByStatus(tenantId: string, statuses: string[]) {
    const tid = requireTenantId(tenantId, 'AdminData.countEmailsByStatus');
    return prisma.emailMessage.count({ where: { tenantId: tid, status: { in: statuses } } });
  }

  async countOutcomesByStatus(tenantId: string, status: string) {
    const tid = requireTenantId(tenantId, 'AdminData.countOutcomesByStatus');
    return prisma.outcomeRecord.count({
      where: { tenantId: tid, verificationStatus: status },
    });
  }

  async countForecasts(tenantId: string) {
    const tid = requireTenantId(tenantId, 'AdminData.countForecasts');
    return prisma.forecast.count({ where: { tenantId: tid } });
  }

  async listForecasts(tenantId: string, limit = 20): Promise<ForecastRecord[]> {
    const tid = requireTenantId(tenantId, 'AdminData.listForecasts');
    const rows = await prisma.forecast.findMany({
      where: { tenantId: tid },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 50),
      select: { id: true, productId: true, prediction: true, confidence: true },
    });
    return rows;
  }

  async countPendingApprovals(tenantId: string) {
    const tid = requireTenantId(tenantId, 'AdminData.countPendingApprovals');
    return prisma.approval.count({ where: { tenantId: tid, status: 'pending' } });
  }

  async listPendingApprovals(tenantId: string, modules: string[]) {
    const tid = requireTenantId(tenantId, 'AdminData.listPendingApprovals');
    const rows = await prisma.approval.findMany({
      where: { tenantId: tid, status: 'pending', module: { in: modules } },
    });
    return rows.map((r) => ({ id: r.id, payload: r.payload, module: r.module }));
  }

  async approveLowRisk(tenantId: string, ids: string[], actorId?: string) {
    const tid = requireTenantId(tenantId, 'AdminData.approveLowRisk');
    const result = await prisma.approval.updateMany({
      where: { tenantId: tid, id: { in: ids } },
      data: { status: 'approved', resolvedAt: new Date(), resolvedBy: actorId },
    });
    return result.count;
  }

  async createSupplier(tenantId: string, name: string, website: string) {
    const tid = requireTenantId(tenantId, 'AdminData.createSupplier');
    return prisma.supplier.create({ data: { tenantId: tid, name, website } });
  }

  async createProduct(
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

  async listSuppliers(tenantId: string, limit = 5) {
    const tid = requireTenantId(tenantId, 'AdminData.listSuppliers');
    return prisma.supplier.findMany({ where: { tenantId: tid }, take: limit });
  }

  async findLatestProposedOutcome(tenantId: string) {
    const tid = requireTenantId(tenantId, 'AdminData.findLatestProposedOutcome');
    return prisma.outcomeRecord.findFirst({
      where: { tenantId: tid, verificationStatus: 'proposed' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countRecentCommands(tenantId: string, daysSince = 7) {
    const tid = requireTenantId(tenantId, 'AdminData.countRecentCommands');
    const since = new Date(Date.now() - daysSince * 86400000);
    return prisma.command.count({ where: { tenantId: tid, createdAt: { gte: since } } });
  }

  async listLowStockInventory(tenantId: string, threshold = 10) {
    const tid = requireTenantId(tenantId, 'AdminData.listLowStockInventory');
    return prisma.inventoryItem.findMany({
      where: { tenantId: tid, quantity: { lt: threshold } },
    });
  }

  async listProductsForBrain(tenantId: string, limit = 200): Promise<BrainProductRecord[]> {
    const tid = requireTenantId(tenantId, 'AdminData.listProductsForBrain');
    return prisma.product.findMany({
      where: { tenantId: tid, status: 'active' },
      take: limit,
      select: { id: true, name: true, price: true, stock: true, slug: true, description: true },
    });
  }

  async searchProductsByName(tenantId: string, query: string, limit = 5): Promise<BrainProductRecord[]> {
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

  async updateProductPricesByIds(tenantId: string, productIds: string[], percentage: number): Promise<number> {
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

  async restoreProductPrices(
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

  async applyRestockUpdates(tenantId: string, items: RestockUpdateItem[]): Promise<number> {
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

  async countCustomers(tenantId: string): Promise<number> {
    const tid = requireTenantId(tenantId, 'AdminData.countCustomers');
    return prisma.customer.count({ where: { tenantId: tid } });
  }

  async getTopCustomers(tenantId: string, limit = 10): Promise<TopCustomerRecord[]> {
    const tid = requireTenantId(tenantId, 'AdminData.getTopCustomers');
    const capped = Math.min(Math.max(limit, 1), 50);
    const customers = await prisma.customer.findMany({
      where: { tenantId: tid },
      take: capped * 3,
      include: {
        orders: {
          select: { total: true },
        },
      },
    });

    return customers
      .map((c) => {
        const orderCount = c.orders.length;
        const totalSpent = c.orders.reduce((sum, o) => sum + o.total, 0);
        const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email;
        return {
          id: c.id,
          email: c.email,
          name,
          orderCount,
          totalSpent: Math.round(totalSpent * 100) / 100,
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent || b.orderCount - a.orderCount)
      .slice(0, capped);
  }

  async getOrderTrends(tenantId: string, days = 30): Promise<OrderTrendSummary> {
    const tid = requireTenantId(tenantId, 'AdminData.getOrderTrends');
    const windowDays = Math.min(Math.max(days, 7), 90);
    const now = Date.now();
    const recentSince = new Date(now - windowDays * 86400000);
    const priorSince = new Date(now - windowDays * 2 * 86400000);

    const [recentOrders, priorOrders] = await Promise.all([
      prisma.order.findMany({
        where: { tenantId: tid, createdAt: { gte: recentSince } },
        select: { status: true },
      }),
      prisma.order.findMany({
        where: { tenantId: tid, createdAt: { gte: priorSince, lt: recentSince } },
        select: { status: true },
      }),
    ]);

    const statusBreakdown: Record<string, number> = {};
    for (const order of recentOrders) {
      statusBreakdown[order.status] = (statusBreakdown[order.status] ?? 0) + 1;
    }

    const recentCount = recentOrders.length;
    const priorCount = priorOrders.length;
    const trendPct =
      priorCount === 0
        ? recentCount > 0
          ? 100
          : 0
        : Math.round(((recentCount - priorCount) / priorCount) * 1000) / 10;

    return { recentCount, priorCount, trendPct, statusBreakdown };
  }

  async listActiveNegotiations(tenantId: string, limit = 20): Promise<NegotiationRecord[]> {
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

  async getNegotiationDetail(tenantId: string, negotiationId: string) {
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
}
