jest.mock('../shared/prisma/client', () => ({
  prisma: {
    outcomeRecord: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'out_1',
        metric: 'revenue',
        confidence: 0.5,
        verificationStatus: 'proposed',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-02-01'),
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  },
}));

jest.mock('../shared/events/eventBus', () => ({
  eventBus: { publish: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../shared/audit/auditService', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../ai/attribution/CausalAttributionService', () => ({
  estimateCausalUplift: jest.fn().mockResolvedValue({ uplift: 10, confidence: 0.5 }),
}));

import {
  verifyOutcomeWithEvidence,
  isBlockedOutcomeSource,
  recordOperationalOutcome,
} from '../shared/outcomes/OutcomeVerificationService';

describe('OutcomeVerificationService', () => {
  it('blocks admin command sources', () => {
    expect(isBlockedOutcomeSource('admin.command')).toBe(true);
  });

  it('rejects verify when causal confidence too low', async () => {
    const result = await verifyOutcomeWithEvidence('out_1', 'tenant_a', 'verified', {
      method: 'causal_uplift',
      confidence: 0.8,
    });
    expect(result.success).toBe(false);
    expect(result.reason).toContain('Causal uplift confidence');
  });

  it('blocks operational outcome from admin price update source', async () => {
    const result = await recordOperationalOutcome({
      tenantId: 'tenant_a',
      metric: 'revenue',
      observed: 100,
      confidence: 0.9,
      periodStart: new Date(),
      periodEnd: new Date(),
      source: 'admin.price_update',
    });
    expect(result).toHaveProperty('blocked', true);
  });
});
