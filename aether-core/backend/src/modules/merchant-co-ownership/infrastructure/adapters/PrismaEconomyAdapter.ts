import { prisma } from '../../../../shared/prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { EconomyPort } from '../../application/ports/EconomyPort';

export class PrismaEconomyAdapter implements EconomyPort {
  async countRecentDistributions(tenantId: string, since: Date) {
    const tid = requireTenantId(tenantId, 'Economy.countRecentDistributions');
    return prisma.revenueDistribution.count({
      where: { tenantId: tid, createdAt: { gte: since } },
    });
  }

  async findMerchantShare(tenantId: string, merchantId: string) {
    const tid = requireTenantId(tenantId, 'Economy.findMerchantShare');
    return prisma.merchantShare.findFirst({ where: { tenantId: tid, merchantId } });
  }

  async createDistribution(
    tenantId: string,
    data: { merchantId: string; amount: number; period: string }
  ) {
    const tid = requireTenantId(tenantId, 'Economy.createDistribution');
    await prisma.revenueDistribution.create({
      data: { tenantId: tid, merchantId: data.merchantId, amount: data.amount, period: data.period },
    });
  }

  async createListing(
    tenantId: string,
    data: { type: string; price: number; sellerId: string; status: string }
  ) {
    const tid = requireTenantId(tenantId, 'Economy.createListing');
    return prisma.marketplaceListing.create({
      data: { tenantId: tid, type: data.type, price: data.price, sellerId: data.sellerId, status: data.status },
    });
  }

  async activateListing(listingId: string, tenantId: string) {
    const tid = requireTenantId(tenantId, 'Economy.activateListing');
    return prisma.marketplaceListing.updateMany({
      where: { id: listingId, tenantId: tid },
      data: { status: 'active' },
    });
  }
}

export const economyAdapter = new PrismaEconomyAdapter();
