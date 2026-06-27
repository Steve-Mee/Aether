import { BrainToolKnowledgeTransferService } from '../BrainToolKnowledgeTransferService';
import type { KnowledgeContributionService } from '../../knowledge-transfer/contribution/KnowledgeContributionService';

describe('BrainToolKnowledgeTransferService', () => {
  it('delegates to KnowledgeContributionService', async () => {
    const contribution = {
      contributeFromToolOutcome: jest.fn().mockResolvedValue({ submitted: 1, rejected: 0 }),
    } as unknown as KnowledgeContributionService;
    const service = new BrainToolKnowledgeTransferService(contribution);

    await service.submitToolOutcome('tenant_a', {
      tool: 'updatePrice',
      approved: true,
      risk: 'medium',
    });

    expect(contribution.contributeFromToolOutcome).toHaveBeenCalledWith('tenant_a', {
      tool: 'updatePrice',
      approved: true,
      risk: 'medium',
    });
  });

  it('no-ops when contribution service missing', async () => {
    const service = new BrainToolKnowledgeTransferService(undefined);
    await expect(
      service.submitToolOutcome('tenant_a', { tool: 'updatePrice', approved: true, risk: 'low' })
    ).resolves.toBeUndefined();
  });
});
