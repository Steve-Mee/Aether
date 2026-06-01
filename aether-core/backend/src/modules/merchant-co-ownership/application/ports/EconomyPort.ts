export interface EconomyPort {
  countRecentDistributions(tenantId: string, since: Date): Promise<number>;
  findMerchantShare(tenantId: string, merchantId: string): Promise<{ percentage: number } | null>;
  createDistribution(
    tenantId: string,
    data: { merchantId: string; amount: number; period: string }
  ): Promise<void>;
  createListing(
    tenantId: string,
    data: { type: string; price: number; sellerId: string; status: string }
  ): Promise<unknown>;
  activateListing(listingId: string, tenantId: string): Promise<unknown>;
}
