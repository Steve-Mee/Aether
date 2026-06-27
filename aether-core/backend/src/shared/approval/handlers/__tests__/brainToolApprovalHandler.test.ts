import { BrainToolApprovalHandler } from '../brainToolApprovalHandler';
import type { PersonalBrainToolRegistry } from '../../../../ai/intelligence/personal-brain/tools/PersonalBrainToolRegistry';
import type { BrainAdaptiveLearningService } from '../../../../ai/intelligence/command-brain/BrainAdaptiveLearningService';
import type { BrainToolKnowledgeTransferService } from '../../../../ai/intelligence/command-brain/BrainToolKnowledgeTransferService';
import type { ResumeBrainAgentRunUseCase } from '../../../../ai/intelligence/command-brain/ResumeBrainAgentRunUseCase';

jest.mock('../../../../ai/intelligence/personal-brain/tools/BrainToolProposalStore', () => ({
  getBrainToolProposal: jest.fn(),
  markProposalStatus: jest.fn(),
}));

import { getBrainToolProposal, markProposalStatus } from '../../../../ai/intelligence/personal-brain/tools/BrainToolProposalStore';

describe('BrainToolApprovalHandler', () => {
  const registry = {
    executeConfirmed: jest.fn().mockResolvedValue({ success: true, result: 'Price updated' }),
  } as unknown as PersonalBrainToolRegistry;

  const adaptiveLearning = {
    recordDecision: jest.fn().mockResolvedValue(undefined),
  } as unknown as BrainAdaptiveLearningService;

  const knowledgeTransfer = {
    submitToolOutcome: jest.fn().mockResolvedValue(undefined),
  } as unknown as BrainToolKnowledgeTransferService;

  const resumeBrainAgentRun = {
    resumeByApprovalId: jest.fn().mockResolvedValue({ resumed: true, agentRunId: 'run-1' }),
  } as unknown as ResumeBrainAgentRunUseCase;

  const handler = new BrainToolApprovalHandler(
    registry,
    adaptiveLearning,
    knowledgeTransfer,
    resumeBrainAgentRun
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles admin-command-bar brain actions', () => {
    expect(handler.canHandle('admin-command-bar', 'brain.updatePrice')).toBe(true);
    expect(handler.canHandle('aether-mail', 'reply')).toBe(false);
  });

  it('executes confirmed tool and marks proposal executed', async () => {
    (getBrainToolProposal as jest.Mock).mockResolvedValue({
      id: 'prop1',
      tool: 'updatePrice',
      status: 'pending',
      payload: JSON.stringify({ productId: 'p1', newPrice: 10 }),
      commandId: 'cmd1',
    });

    await handler.execute({
      tenantId: 't1',
      approvalId: 'ap1',
      module: 'admin-command-bar',
      actionType: 'brain.updatePrice',
      payload: { proposalId: 'prop1' },
      resolvedBy: 'merchant1',
    });

    expect(registry.executeConfirmed).toHaveBeenCalledWith(
      'updatePrice',
      expect.objectContaining({ tenantId: 't1', actorId: 'merchant1', commandId: 'cmd1' }),
      { productId: 'p1', newPrice: 10 }
    );
    expect(markProposalStatus).toHaveBeenCalledWith('prop1', 't1', 'executed', 'Price updated');
    expect(adaptiveLearning.recordDecision).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ tool: 'updatePrice', approved: true })
    );
    expect(knowledgeTransfer.submitToolOutcome).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ tool: 'updatePrice', approved: true })
    );
    expect(resumeBrainAgentRun.resumeByApprovalId).toHaveBeenCalledWith('ap1', 't1');
  });
});
