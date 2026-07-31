import { buildAgentRunSummary } from '../types/AgentPlan';
import type { AgentLoopOutput, AgentLoopRunInput } from '../AgentLoopTypes';
import type { LoopContext } from './LoopContext';
import { skipRemainingPlanSteps } from './PlanStepTracker';

export function buildCancelledOutput(
  ctx: LoopContext,
  agentRunId: string | undefined,
  _input: AgentLoopRunInput
): AgentLoopOutput {
  const summary = buildAgentRunSummary({
    plan: ctx.plan,
    toolTrace: ctx.toolTrace,
    pendingActions: ctx.pendingActions,
    narrative: 'Agent gestopt door gebruiker.',
    goalReached: false,
    failedPlanSteps: ctx.failedPlanSteps,
    reflections: ctx.reflections,
    planRevisions: ctx.planRevisions,
  });
  return {
    narrative: summary.narrative,
    toolTrace: ctx.toolTrace,
    pendingActions: ctx.pendingActions,
    agentRunId,
    transcript: ctx.transcript.getMessages(),
    runStatus: 'cancelled',
    plan: ctx.plan ?? undefined,
    summary,
  };
}

export function finalizeSuccess(
  ctx: LoopContext,
  narrative: string,
  actionProposal?: string
): AgentLoopOutput {
  skipRemainingPlanSteps(ctx);
  const summary = buildAgentRunSummary({
    plan: ctx.plan,
    toolTrace: ctx.toolTrace,
    pendingActions: ctx.pendingActions,
    narrative,
    goalReached: true,
    failedPlanSteps: ctx.failedPlanSteps,
    reflections: ctx.reflections,
    planRevisions: ctx.planRevisions,
  });
  return {
    narrative,
    actionProposal,
    toolTrace: ctx.toolTrace,
    pendingActions: ctx.pendingActions,
    runStatus: 'completed',
    plan: ctx.plan ?? undefined,
    summary,
  };
}

export function finalizeFailure(ctx: LoopContext, narrative: string): AgentLoopOutput {
  const summary = buildAgentRunSummary({
    plan: ctx.plan,
    toolTrace: ctx.toolTrace,
    pendingActions: ctx.pendingActions,
    narrative,
    goalReached: false,
    failedPlanSteps: ctx.failedPlanSteps,
    reflections: ctx.reflections,
    planRevisions: ctx.planRevisions,
  });
  return {
    narrative,
    toolTrace: ctx.toolTrace,
    pendingActions: ctx.pendingActions,
    actionProposal: ctx.pendingActions[0]?.summary,
    runStatus: 'failed',
    plan: ctx.plan ?? undefined,
    summary,
    error: narrative,
  };
}
