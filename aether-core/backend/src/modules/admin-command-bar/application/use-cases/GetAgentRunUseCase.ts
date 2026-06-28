import { AgentTranscript } from '../../../../ai/intelligence/command-brain/AgentTranscript';
import { classifyBrainAction } from '../../../../ai/intelligence/personal-brain/tools/ActionRiskClassifier';
import {
  getBrainAgentRunByCommandId,
  listPendingProposalsForCommand,
} from '../../../../ai/intelligence/command-brain/BrainAgentRunStore';

function mapPendingProposal(p: {
  id: string;
  tool: string;
  summary: string;
  risk: string;
  payload: string;
  approvalId: string | null;
}) {
  const payload = JSON.parse(p.payload) as Record<string, unknown>;
  const assessment = classifyBrainAction(p.tool, payload, {
    productCount: Array.isArray(payload.productIds) ? payload.productIds.length : undefined,
  });
  return {
    proposalId: p.id,
    tool: p.tool,
    summary: p.summary,
    risk: p.risk as 'low' | 'medium' | 'high',
    requiresApproval: p.risk !== 'low' || Boolean(p.approvalId),
    payload,
    approvalId: p.approvalId ?? undefined,
    expectedImpact: assessment.expectedImpact,
    confidence: assessment.confidence,
    rationale: assessment.rationale,
  };
}

export class GetAgentRunUseCase {
  async execute(commandId: string, tenantId: string) {
    const run = await getBrainAgentRunByCommandId(commandId, tenantId);
    const pending = await listPendingProposalsForCommand(commandId, tenantId);

    if (!run) {
      return {
        commandId,
        agentRunId: null,
        transcript: [],
        pendingActions: pending.map(mapPendingProposal),
        status: 'unknown' as const,
      };
    }

    const transcript = AgentTranscript.fromJSON(JSON.parse(run.transcript)).getMessages();

    return {
      commandId,
      agentRunId: run.id,
      transcript,
      status: run.status as
        | 'running'
        | 'completed'
        | 'failed'
        | 'awaiting_approval'
        | 'cancelled'
        | 'unknown',
      awaitingApprovalId: run.pendingApprovalId ?? undefined,
      checkpoint: run.status === 'awaiting_approval',
      pendingActions: pending.map(mapPendingProposal),
    };
  }
}
