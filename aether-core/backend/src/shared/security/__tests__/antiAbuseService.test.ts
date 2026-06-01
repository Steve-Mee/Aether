jest.mock('../../prisma/client', () => ({
  prisma: {
    merchantShare: { count: jest.fn().mockResolvedValue(0) },
    marketplaceListing: { count: jest.fn().mockResolvedValue(2) },
    auditLog: { count: jest.fn().mockResolvedValue(0) },
  },
}));

import {
  assertCoOwnershipAllowed,
  assertMarketplaceListingAllowed,
  getSellerReputation,
  assertPhysicalDevicePayload,
} from '../antiAbuseService';
import { prisma } from '../../prisma/client';

describe('antiAbuseService', () => {
  it('allows co-ownership under daily cap', async () => {
    await expect(assertCoOwnershipAllowed('tenant_default', 'm1')).resolves.toBeUndefined();
  });

  it('blocks marketplace listing when cap reached', async () => {
    (prisma.marketplaceListing.count as jest.Mock)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(50);
    await expect(assertMarketplaceListingAllowed('tenant_default')).rejects.toThrow(/cap reached/);
  });

  it('returns full reputation for new sellers', async () => {
    (prisma.marketplaceListing.count as jest.Mock).mockResolvedValueOnce(0);
    await expect(getSellerReputation('tenant_default')).resolves.toBe(1);
  });

  it('rejects oversized physical sync batches', () => {
    expect(() => assertPhysicalDevicePayload(Array.from({ length: 501 }, () => ({})))).toThrow(/500/);
  });
});
