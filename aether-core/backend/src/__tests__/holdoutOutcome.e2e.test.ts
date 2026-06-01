import { verifyOutcomeWithEvidence } from '../shared/outcomes/OutcomeVerificationService';
import { prisma } from '../shared/prisma/client';

jest.mock('../shared/prisma/client', () => ({
  prisma: {
    outcomeRecord: {
      findFirst: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  },
}));

jest.mock('../shared/audit/auditService', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../shared/events/eventBus', () => ({
  eventBus: { publish: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../ai/attribution/CausalAttributionService', () => ({
  estimateCausalUplift: jest.fn().mockResolvedValue({ uplift: 5, confidence: 0.8 }),
}));

describe('outcome verification holdout policy', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects billable when outcome is not yet verified', async () => {
    (prisma.outcomeRecord.findFirst as jest.Mock).mockResolvedValue({
      id: 'rec_1',
      tenantId: 'tenant_a',
      verificationStatus: 'proposed',
      metric: 'revenue',
      periodStart: new Date(),
      periodEnd: new Date(),
    });

    const result = await verifyOutcomeWithEvidence('rec_1', 'tenant_a', 'billable', {
      method: 'holdout_experiment',
      confidence: 0.9,
    });

    expect(result.success).toBe(false);
    expect(result.reason).toContain('verified');
  });
});
