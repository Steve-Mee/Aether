jest.mock('../shared/prisma/client', () => ({
  prisma: {
    order: {
      findMany: jest.fn().mockResolvedValue([{ total: 100 }, { total: 200 }]),
    },
    emailMessage: { count: jest.fn().mockResolvedValue(5) },
    outcomeRecord: {
      create: jest.fn().mockResolvedValue({ id: 'out_1' }),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  },
}));

jest.mock('../shared/events/eventBus', () => ({
  eventBus: { publish: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../ai/attribution/CausalAttributionService', () => ({
  estimateCausalUplift: jest.fn().mockResolvedValue({ uplift: 15, confidence: 0.8 }),
}));

import { computeBaseline, recordOutcome } from '../ai/attribution/OutcomeEngine';
import { prisma } from '../shared/prisma/client';

describe('OutcomeEngine', () => {
  it('computes revenue baseline from orders', async () => {
    const baseline = await computeBaseline(
      'tenant_default',
      'revenue',
      new Date('2026-01-01'),
      new Date('2026-02-01')
    );
    expect(baseline).toBe(300);
    expect(prisma.order.findMany).toHaveBeenCalled();
  });

  it('records outcome with computed baseline', async () => {
    const result = await recordOutcome({
      tenantId: 'tenant_default',
      metric: 'revenue',
      observed: 400,
      confidence: 0.8,
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-02-01'),
    });
    expect(result.id).toBe('out_1');
    expect(prisma.outcomeRecord.create).toHaveBeenCalled();
  });
});
