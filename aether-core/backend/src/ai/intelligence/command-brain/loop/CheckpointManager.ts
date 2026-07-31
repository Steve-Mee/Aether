import type { AgentTranscript } from '../AgentTranscript';
import type { AgentStreamCallback } from '../AgentStreamEvents';
import { buildAgentRunSummary } from '../types/AgentPlan';
import { updateBrainAgentRunCheckpoint } from '../BrainAgentRunStore';
import type { AgentLoopOutput, AgentLoopRunInput } from '../AgentLoopTypes';
import type { BrainToolTraceEntry, ToolProposal } from '../../personal-brain/tools/types';
import type { LoopContext } from './LoopContext';
import { emitLoopEvent } from './loopEvents';

export async function maybeCheckpoint(
  proposal: ToolProposal,
  input: AgentLoopRunInput,
  agentRunId: string | undefined,
  step: number,
  totalSteps: number,
  transcript: AgentTranscript,
  onEvent: AgentStreamCallback | undefined,
  toolTrace: BrainToolTraceEntry[],
  pendingActions: ToolProposal[],
  ctx: LoopContext
): Promise<AgentLoopOutput | null> {
  if (!proposal.approvalId || !agentRunId) return null;

  await updateBrainAgentRunCheckpoint({
    id: agentRunId,
    tenantId: input.tenantId,
    transcript: transcript.getMessages(),
    currentStep: step,
    totalSteps,
    pendingApprovalId: proposal.approvalId,
    pendingProposalId: proposal.proposalId,
  });

  emitLoopEvent(onEvent, input.agentKey, {
    type: 'checkpoint',
    step,
    proposalId: proposal.proposalId,
    summary: proposal.summary,
  });

  const narrative = `Agent wacht op goedkeuring: ${proposal.summary}`;
  const summary = buildAgentRunSummary({
    plan: ctx.plan,
    toolTrace,
    pendingActions,
    narrative,
    goalReached: false,
    failedPlanSteps: ctx.failedPlanSteps,
    reflections: ctx.reflections,
    planRevisions: ctx.planRevisions,
  });

  return {
    narrative,
    actionProposal: proposal.summary,
    toolTrace,
    pendingActions,
    checkpoint: true,
    awaitingApprovalId: proposal.approvalId,
    runStatus: 'awaiting_approval',
    plan: ctx.plan ?? undefined,
    summary,
  };
}
