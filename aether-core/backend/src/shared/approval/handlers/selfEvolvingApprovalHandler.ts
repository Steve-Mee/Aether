import { getCompositionRoot } from '../../../bootstrap/compositionRoot';
import { writeAuditLog } from '../../audit/auditService';
import { prisma } from '../../prisma/client';
import { autonomyStateMachine } from '../../autonomy/AutonomyStateMachine';
import type { ApprovalActionHandler, ApprovalExecutionContext } from '../types';

export class SelfEvolvingApprovalHandler implements ApprovalActionHandler {
  canHandle(module: string, actionType: string): boolean {
    return module === 'self-evolving-codebase' && actionType === 'apply_proposal';
  }

  async execute(ctx: ApprovalExecutionContext): Promise<void> {
    const proposalId = String(ctx.payload.proposalId ?? '');
    if (!proposalId) throw new Error('apply_proposal approval missing proposalId');

    const dedupeToken = `"approvalId":"${ctx.approvalId}"`;
    const alreadyExecuted = await prisma.auditLog.findFirst({
      where: {
        tenantId: ctx.tenantId,
        action: 'action_executed',
        details: { contains: dedupeToken },
      },
    });
    if (alreadyExecuted) return;

    const { selfEvolving } = getCompositionRoot();
    const proposal = await selfEvolving.findProposal(ctx.tenantId, proposalId);
    if (!proposal) throw new Error(`Proposal not found: ${proposalId}`);

    const nextStage = autonomyStateMachine.nextStage('human_gate', 'rollout_complete');
    await selfEvolving.updateProposalStatus(proposalId, nextStage);

    await writeAuditLog({
      tenantId: ctx.tenantId,
      module: 'self-evolving-codebase',
      action: 'action_executed',
      actor: ctx.resolvedBy,
      details: {
        approvalId: ctx.approvalId,
        proposalId,
        stage: nextStage,
        note: 'Proposal promoted after approval — live code apply still gated by policy',
        dedupeToken,
      },
    });
  }
}
