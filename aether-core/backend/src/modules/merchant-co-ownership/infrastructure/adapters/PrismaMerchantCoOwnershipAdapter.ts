import { prisma } from '../../../../shared/prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class PrismaMerchantCoOwnershipAdapter {
  async issueShare(tenantId: string, merchantId: string, percentage: number) {
    const tid = requireTenantId(tenantId, 'MerchantCoOwnership.issueShare');
    return prisma.merchantShare.create({ data: { tenantId: tid, merchantId, percentage } });
  }

  async listShares(tenantId: string, merchantId: string) {
    const tid = requireTenantId(tenantId, 'MerchantCoOwnership.listShares');
    return prisma.merchantShare.findMany({ where: { tenantId: tid, merchantId } });
  }

  async listActiveListings(tenantId: string) {
    const tid = requireTenantId(tenantId, 'MerchantCoOwnership.listActiveListings');
    return prisma.marketplaceListing.findMany({ where: { tenantId: tid, status: 'active' } });
  }

  async createListing(
    tenantId: string,
    data: { type: string; price: number; sellerId: string }
  ) {
    const tid = requireTenantId(tenantId, 'MerchantCoOwnership.createListing');
    return prisma.marketplaceListing.create({
      data: { tenantId: tid, ...data, status: 'active' },
    });
  }
}
