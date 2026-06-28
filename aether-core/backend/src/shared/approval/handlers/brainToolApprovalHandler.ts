import type { ApprovalActionHandler, ApprovalExecutionContext } from '../types';
import { getBrainToolProposal, markProposalStatus } from '../../../ai/intelligence/personal-brain/tools/BrainToolProposalStore';
import type { PersonalBrainToolRegistry } from '../../../ai/intelligence/personal-brain/tools/PersonalBrainToolRegistry';
import type { BrainAdaptiveLearningService } from '../../../ai/intelligence/command-brain/BrainAdaptiveLearningService';
import type { BrainToolKnowledgeTransferService } from '../../../ai/intelligence/command-brain/BrainToolKnowledgeTransferService';
import type { ResumeBrainAgentRunUseCase } from '../../../ai/intelligence/command-brain/ResumeBrainAgentRunUseCase';

export class BrainToolApprovalHandler implements ApprovalActionHandler {
  constructor(
    private toolRegistry: PersonalBrainToolRegistry,
    private adaptiveLearning?: BrainAdaptiveLearningService,
    private knowledgeTransfer?: BrainToolKnowledgeTransferService,
    private resumeBrainAgentRun?: ResumeBrainAgentRunUseCase
  ) {}

  canHandle(module: string, actionType: string): boolean {
    return module === 'admin-command-bar' && actionType.startsWith('brain.');
  }

  async execute(ctx: ApprovalExecutionContext): Promise<void> {
    const proposalId = String(ctx.payload.proposalId ?? '');
    const proposal = await getBrainToolProposal(proposalId, ctx.tenantId);

    if (!proposal || proposal.status !== 'pending') {
      throw new Error('Brain tool proposal not found or already resolved');
    }

    const payload = JSON.parse(proposal.payload) as Record<string, unknown>;
    const result = await this.toolRegistry.executeConfirmed(proposal.tool, {
      tenantId: ctx.tenantId,
      actorId: ctx.resolvedBy,
      commandId: proposal.commandId ?? undefined,
    }, payload);

    if (!result.success) {
      throw new Error(result.error ?? 'Brain tool execution failed');
    }

    await markProposalStatus(proposal.id, ctx.tenantId, 'executed', result.result);

    if (this.adaptiveLearning) {
      await this.adaptiveLearning.recordDecision(ctx.tenantId, {
        tool: proposal.tool,
        approved: true,
        risk: proposal.risk,
        inputSummary: proposal.summary,
      });
    }

    if (this.knowledgeTransfer) {
      await this.knowledgeTransfer.submitToolOutcome(ctx.tenantId, {
        tool: proposal.tool,
        approved: true,
        risk: proposal.risk,
      });
    }

    if (this.resumeBrainAgentRun && ctx.approvalId) {
      await this.resumeBrainAgentRun.resumeByApprovalId(ctx.approvalId, ctx.tenantId);
    }
  }
}
