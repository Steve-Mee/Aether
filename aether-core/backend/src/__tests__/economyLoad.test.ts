import { AetherEconomyService } from '../modules/merchant-co-ownership/application/services/AetherEconomyService';
import type { EconomyPort } from '../modules/merchant-co-ownership/application/ports/EconomyPort';

jest.mock('../shared/audit/auditService', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

describe('AetherEconomyService load', () => {
  const economy: EconomyPort = {
    countRecentDistributions: jest.fn().mockResolvedValue(0),
    findMerchantShare: jest.fn().mockResolvedValue({ percentage: 15 }),
    createDistribution: jest.fn().mockResolvedValue(undefined),
    createListing: jest.fn(),
    activateListing: jest.fn(),
  };
  const service = new AetherEconomyService(economy);

  it('handles sequential distribution calls under daily cap', async () => {
    const ctx = { tenantId: 'tenant_default', merchantId: 'merchant_1', actorId: 'load-test' };
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) => service.distributeRevenue(100 + i, '2026-05', ctx))
    );
    expect(results).toHaveLength(5);
    results.forEach((r) => {
      expect(r.distributedToOwners).toBeGreaterThan(0);
    });
  });
});
