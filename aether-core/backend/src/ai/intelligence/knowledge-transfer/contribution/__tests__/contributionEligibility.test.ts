import { findEligibleContributionTenants, metricFingerprint } from '../contributionEligibility';
import { prisma } from '../../../../../shared/prisma/client';

jest.mock('../../../../../shared/prisma/client', () => ({
  prisma: {
    tenantSettings: { findMany: jest.fn() },
  },
}));

jest.mock('../../isKnowledgeTransferEnabled', () => ({
  isKnowledgeTransferEnabledEnv: jest.fn().mockReturnValue(true),
}));

describe('contributionEligibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('metricFingerprint is stable hash', () => {
    const a = metricFingerprint('pricing', 'auto_apply_rate');
    const b = metricFingerprint('pricing', 'auto_apply_rate');
    expect(a).toBe(b);
    expect(a).toHaveLength(16);
  });

  it('findEligibleContributionTenants filters by governance mode', async () => {
    (prisma.tenantSettings.findMany as jest.Mock).mockResolvedValue([
      { tenantId: 't1', brainKnowledgeGovernanceMode: 'full_loop', brainKnowledgeTransferEnabled: true },
      { tenantId: 't2', brainKnowledgeGovernanceMode: 'receive_only', brainKnowledgeTransferEnabled: true },
      { tenantId: 't3', brainKnowledgeGovernanceMode: 'contribute_only', brainKnowledgeTransferEnabled: false },
    ]);

    const tenants = await findEligibleContributionTenants();
    expect(tenants).toEqual(['t1']);
  });
});
