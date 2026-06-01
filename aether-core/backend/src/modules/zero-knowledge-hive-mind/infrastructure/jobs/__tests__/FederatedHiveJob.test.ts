jest.mock('../../../../../shared/prisma/client', () => ({
  prisma: {
    insight: {
      findMany: jest.fn().mockResolvedValue([
        { type: 'pricing' },
        { type: 'pricing' },
        { type: 'inventory' },
      ]),
    },
  },
}));

import { runFederatedHiveJob } from '../FederatedHiveJob';

describe('FederatedHiveJob', () => {
  it('aggregates insights with differential privacy noise', async () => {
    const result = await runFederatedHiveJob('tenant_default');
    expect(result.insightCount).toBe(3);
    expect(result.noiseApplied).toBe(true);
    expect(result.categories.pricing).toBeGreaterThanOrEqual(0);
    expect(result.categories.inventory).toBeGreaterThanOrEqual(0);
  });
});
