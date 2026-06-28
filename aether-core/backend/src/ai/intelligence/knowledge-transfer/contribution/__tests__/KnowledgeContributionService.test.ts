import { KnowledgeContributionService } from '../KnowledgeContributionService';
import type { KnowledgeTransferPort } from '../../KnowledgeTransferPort';
import type { ContributionGatePort } from '../ContributionGatePort';
import { prisma } from '../../../../../shared/prisma/client';

jest.mock('../../../../../shared/prisma/client', () => ({
  prisma: {
    brainKnowledgeContributionLog: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
    },
  },
}));

describe('KnowledgeContributionService', () => {
  const knowledgeTransfer: jest.Mocked<KnowledgeTransferPort> = {
    getKnowledgeUpdates: jest.fn(),
    submitAnonymizedInsights: jest.fn().mockResolvedValue({ accepted: true, count: 1 }),
  };

  const gate: jest.Mocked<ContributionGatePort> = {
    canContribute: jest.fn().mockResolvedValue(true),
    shouldFederate: jest.fn().mockResolvedValue(false),
  };

  const federatedPipeline = {
    refreshFromTenantInsights: jest.fn().mockResolvedValue(2),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.INTELLIGENCE_AUTO_FEDERATE_ON_CONTRIBUTE;
  });

  it('submits filtered insights and logs audit rows', async () => {
    const service = new KnowledgeContributionService(knowledgeTransfer, gate);
    const result = await service.submitInsights(
      'tenant_a',
      [{ category: 'pricing', metric: 'auto_apply_rate', value: 1, sampleSize: 1 }],
      'domain_event'
    );

    expect(result.submitted).toBe(1);
    expect(result.notice).toContain('Anonieme inzichten');
    expect(knowledgeTransfer.submitAnonymizedInsights).toHaveBeenCalledWith('tenant_a', [
      { category: 'pricing', metric: 'auto_apply_rate', value: 1, sampleSize: 1 },
    ]);
    expect(prisma.brainKnowledgeContributionLog.createMany).toHaveBeenCalled();
  });

  it('skips when gate blocks contribution', async () => {
    gate.canContribute.mockResolvedValue(false);
    const service = new KnowledgeContributionService(knowledgeTransfer, gate);
    const result = await service.submitInsights('tenant_a', [
      { category: 'pricing', metric: 'auto_apply_rate', value: 1 },
    ]);

    expect(result.submitted).toBe(0);
    expect(knowledgeTransfer.submitAnonymizedInsights).not.toHaveBeenCalled();
  });

  it('triggers federated refresh when configured', async () => {
    process.env.INTELLIGENCE_AUTO_FEDERATE_ON_CONTRIBUTE = 'true';
    gate.canContribute.mockResolvedValue(true);
    gate.shouldFederate.mockResolvedValue(true);
    const service = new KnowledgeContributionService(
      knowledgeTransfer,
      gate,
      federatedPipeline
    );

    await service.submitInsights(
      'tenant_a',
      [{ category: 'pricing', metric: 'auto_apply_rate', value: 1 }],
      'tool_outcome'
    );

    expect(gate.shouldFederate).toHaveBeenCalledWith('tenant_a');
    expect(federatedPipeline.refreshFromTenantInsights).toHaveBeenCalled();
  });
});
