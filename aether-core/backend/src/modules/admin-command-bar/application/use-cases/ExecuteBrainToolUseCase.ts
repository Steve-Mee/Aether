import { writeAuditLog } from '../../../../shared/audit/auditService';
import { assessApprovalAutoEligible } from '../../../../shared/policy/assessApprovalAutoEligible';
import type { BrainAdaptiveLearningService } from '../../../../ai/intelligence/command-brain/BrainAdaptiveLearningService';
import type { PersonalBrainToolRegistry } from '../../../../ai/intelligence/personal-brain/tools/PersonalBrainToolRegistry';
import type { PersonalBrainRegistry } from '../../../../ai/intelligence/personal-brain/PersonalBrainRegistry';
import {
  getBrainToolProposal,
  markProposalStatus,
} from '../../../../ai/intelligence/personal-brain/tools/BrainToolProposalStore';

import type { BrainToolKnowledgeTransferService } from '../../../../ai/intelligence/command-brain/BrainToolKnowledgeTransferService';

export class ExecuteBrainToolUseCase {
  constructor(
    private toolRegistry: PersonalBrainToolRegistry,
    private personalBrainRegistry: PersonalBrainRegistry,
    private adaptiveLearning?: BrainAdaptiveLearningService,
    private knowledgeTransfer?: BrainToolKnowledgeTransferService
  ) {}

  async execute(
    proposalId: string,
    ctx: { tenantId: string; actorId?: string; commandId?: string }
  ) {
    const proposal = await getBrainToolProposal(proposalId, ctx.tenantId);
    if (!proposal) {
      return { success: false, message: 'Proposal not found', proposalId };
    }
    if (proposal.status !== 'pending') {
      return { success: false, message: `Proposal already ${proposal.status}`, proposalId };
    }
    if (proposal.expiresAt < new Date()) {
      await markProposalStatus(proposalId, ctx.tenantId, 'expired');
      return { success: false, message: 'Proposal expired', proposalId };
    }

    const payload = JSON.parse(proposal.payload) as Record<string, unknown>;

    if (proposal.risk === 'high' || proposal.tool === 'createApproval') {
      // high-risk always requires explicit user execute click (this endpoint)
    } else if (proposal.tool === 'updatePrice') {
      const assessment = await assessApprovalAutoEligible({
        tenantId: ctx.tenantId,
        module: 'admin-command-bar',
        actionType: 'price.change',
        payload: {
          percentage: payload.percentage,
          productIds: payload.productIds,
        },
      });
      if (!assessment.eligible && proposal.risk !== 'low') {
        await writeAuditLog({
          tenantId: ctx.tenantId,
          module: 'admin-command-bar',
          action: 'brain_tool_failed',
          actor: ctx.actorId,
          details: { proposalId, reason: assessment.reason },
        });
        return {
          success: false,
          message: `Goedkeuring vereist: ${assessment.reason}`,
          proposalId,
          requiresApproval: true,
        };
      }
    }

    const result = await this.toolRegistry.executeConfirmed(proposal.tool, {
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      commandId: ctx.commandId ?? proposal.commandId ?? undefined,
    }, payload);

    if (!result.success) {
      await writeAuditLog({
        tenantId: ctx.tenantId,
        module: 'admin-command-bar',
        action: 'brain_tool_failed',
        actor: ctx.actorId,
        details: { proposalId, tool: proposal.tool, error: result.error },
      });
      return { success: false, message: result.error ?? 'Tool execution failed', proposalId };
    }

    await markProposalStatus(proposalId, ctx.tenantId, 'executed', result.result);

    await writeAuditLog({
      tenantId: ctx.tenantId,
      module: 'admin-command-bar',
      action: 'brain_tool_executed',
      actor: ctx.actorId,
      details: { proposalId, tool: proposal.tool, result: result.result },
    });

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

    try {
      const brain = this.personalBrainRegistry.get(ctx.tenantId, 'admin');
      await brain.remember({
        command: `tool_executed:${proposal.tool}`,
        intent: proposal.tool,
        result: result.result,
      });
    } catch {
      // best-effort
    }

    return {
      success: true,
      message: result.result,
      proposalId,
      tool: proposal.tool,
      undoable: result.undoable,
      operationalMeta: result.operationalMeta,
    };
  }

  async reject(
    proposalId: string,
    ctx: { tenantId: string; actorId?: string }
  ) {
    const proposal = await getBrainToolProposal(proposalId, ctx.tenantId);
    if (!proposal || proposal.status !== 'pending') {
      return { success: false, message: 'Proposal not found or already resolved', proposalId };
    }

    await markProposalStatus(proposalId, ctx.tenantId, 'rejected');

    await writeAuditLog({
      tenantId: ctx.tenantId,
      module: 'admin-command-bar',
      action: 'brain_tool_rejected',
      actor: ctx.actorId,
      details: { proposalId, tool: proposal.tool },
    });

    if (this.adaptiveLearning) {
      await this.adaptiveLearning.recordDecision(ctx.tenantId, {
        tool: proposal.tool,
        approved: false,
        risk: proposal.risk,
        inputSummary: proposal.summary,
      });
    }

    if (this.knowledgeTransfer) {
      await this.knowledgeTransfer.submitToolOutcome(ctx.tenantId, {
        tool: proposal.tool,
        approved: false,
        risk: proposal.risk,
      });
    }

    return { success: true, message: 'Proposal rejected', proposalId };
  }
}
