import { prisma } from '../prisma/client';

const MAX_SHARES_PER_DAY = parseInt(process.env.CO_OWNERSHIP_MAX_SHARES_PER_DAY ?? '10', 10);
const MAX_LISTINGS_PER_TENANT = parseInt(process.env.MARKETPLACE_MAX_LISTINGS ?? '50', 10);
const MIN_SELLER_REPUTATION = parseFloat(process.env.MARKETPLACE_MIN_REPUTATION ?? '0.5');

export async function assertCoOwnershipAllowed(tenantId: string, merchantId: string): Promise<void> {
  const since = new Date(Date.now() - 86400000);
  const recent = await prisma.merchantShare.count({
    where: { tenantId, merchantId, createdAt: { gte: since } },
  });
  if (recent >= MAX_SHARES_PER_DAY) {
    throw new Error(`Co-ownership rate limit: max ${MAX_SHARES_PER_DAY} share issuances per merchant per day`);
  }
}

export async function getSellerReputation(tenantId: string): Promise<number> {
  const [listings, violations] = await Promise.all([
    prisma.marketplaceListing.count({ where: { tenantId } }),
    prisma.auditLog.count({
      where: { tenantId, module: 'merchant-co-ownership', action: { contains: 'abuse' } },
    }),
  ]);
  if (listings === 0) return 1;
  const penalty = Math.min(0.5, violations * 0.1);
  return Math.max(0, 1 - penalty);
}

export async function assertMarketplaceListingAllowed(tenantId: string): Promise<void> {
  const reputation = await getSellerReputation(tenantId);
  if (reputation < MIN_SELLER_REPUTATION) {
    throw new Error(`Marketplace listing blocked: seller reputation ${reputation.toFixed(2)} below minimum`);
  }

  const active = await prisma.marketplaceListing.count({
    where: { tenantId, status: 'active' },
  });
  if (active >= MAX_LISTINGS_PER_TENANT) {
    throw new Error(`Marketplace listing cap reached (${MAX_LISTINGS_PER_TENANT})`);
  }
}

export function assertPhysicalDevicePayload(inventory: unknown[]): void {
  if (inventory.length > 500) {
    throw new Error('Physical sync batch exceeds 500 items');
  }
}
