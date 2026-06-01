import { writeAuditLog } from '../../../../shared/audit/auditService';
import type { EconomyPort } from '../ports/EconomyPort';

const MAX_SHARE_PCT = 49;
const MAX_DISTRIBUTIONS_PER_DAY = 10;

export class AetherEconomyService {
  constructor(private economy: EconomyPort) {}

  async distributeRevenue(
    totalRevenue: number,
    period: string,
    ctx: { tenantId: string; merchantId: string; actorId?: string }
  ) {
    if (totalRevenue <= 0) throw new Error('Invalid revenue amount');

    const todayCount = await this.economy.countRecentDistributions(
      ctx.tenantId,
      new Date(Date.now() - 86400000)
    );
    if (todayCount >= MAX_DISTRIBUTIONS_PER_DAY) {
      throw new Error('Rate limit: max distributions per day exceeded');
    }

    const share = await this.economy.findMerchantShare(ctx.tenantId, ctx.merchantId);
    const pct = share?.percentage ?? 15;
    if (pct > MAX_SHARE_PCT) throw new Error('Share cap exceeded');

    const toOwners = totalRevenue * (pct / 100);

    await this.economy.createDistribution(ctx.tenantId, {
      merchantId: ctx.merchantId,
      amount: toOwners,
      period,
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      module: 'merchant-co-ownership',
      action: 'revenue_distributed',
      actor: ctx.actorId,
      details: { totalRevenue, toOwners, period, pct },
    });

    return { totalRevenue, distributedToOwners: toOwners, period, sharePct: pct };
  }

  async createListing(ctx: { tenantId: string; type: string; price: number; sellerId: string }) {
    return this.economy.createListing(ctx.tenantId, {
      type: ctx.type,
      price: ctx.price,
      sellerId: ctx.sellerId,
      status: 'review',
    });
  }

  async activateListing(listingId: string, tenantId: string) {
    return this.economy.activateListing(listingId, tenantId);
  }
}
