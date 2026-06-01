import { prisma } from '../../../../shared/prisma/client';
import { AdminDataPort } from '../../application/ports/AdminDataPort';
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
    const tid = requireTenantId(tenantId, 'AdminData.listRecentOrders');
    return prisma.order.findMany({
      where: { tenantId: tid },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
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

  async countPendingApprovals(tenantId: string) {
    const tid = requireTenantId(tenantId, 'AdminData.countPendingApprovals');
    return prisma.approval.count({ where: { tenantId: tid, status: 'pending' } });
  }

  async listPendingApprovals(tenantId: string, modules: string[]) {
    const tid = requireTenantId(tenantId, 'AdminData.listPendingApprovals');
    return prisma.approval.findMany({
      where: { tenantId: tid, status: 'pending', module: { in: modules } },
    });
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
}
