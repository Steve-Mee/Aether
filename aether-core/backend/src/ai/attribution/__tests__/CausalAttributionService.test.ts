jest.mock('../../../shared/prisma/client', () => ({
  prisma: {
    order: {
      findMany: jest.fn(),
    },
    experimentAssignment: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  },
}));

import { prisma } from '../../../shared/prisma/client';
import { estimateCausalUplift } from '../CausalAttributionService';

describe('CausalAttributionService', () => {
  it('estimates revenue uplift with propensity score when enough orders', async () => {
    const treated = Array.from({ length: 6 }, (_, i) => ({ total: 100 + i * 10 }));
    const control = Array.from({ length: 6 }, (_, i) => ({ total: 50 + i * 5 }));
    (prisma.order.findMany as jest.Mock)
      .mockResolvedValueOnce(treated)
      .mockResolvedValueOnce(control);

    const start = new Date('2026-01-01');
    const end = new Date('2026-02-01');
    const estimate = await estimateCausalUplift('tenant_default', 'revenue', start, end);

    expect(estimate.uplift).toBe(375);
    expect(estimate.method).toBe('propensity_score');
    expect(estimate.confidence).toBeGreaterThan(0.5);
  });

  it('returns zero uplift for non-revenue metrics', async () => {
    const estimate = await estimateCausalUplift(
      'tenant_default',
      'conversion',
      new Date(),
      new Date()
    );
    expect(estimate.uplift).toBe(0);
    expect(estimate.method).toBe('difference_in_differences');
  });
});
