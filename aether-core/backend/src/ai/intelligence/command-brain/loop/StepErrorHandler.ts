import type { BrainAgentPlanner } from '../BrainAgentPlanner';
import type { AgentLoopOutput } from '../AgentLoopTypes';
import type { LoopContext } from './LoopContext';
import { emitPlanProgress } from './PlanStepTracker';
import { emitLoopEvent } from './loopEvents';
import { finalizeFailure } from './LoopOutcomes';

export async function handleStepError(
  ctx: LoopContext,
  step: number,
  message: string,
  planner: BrainAgentPlanner
): Promise<AgentLoopOutput | 'replan'> {
  ctx.toolTrace.push({ tool: 'agent_loop', input: { step }, output: message, status: 'error' });
  emitLoopEvent(ctx.onEvent, ctx.input.agentKey, { type: 'error', error: message, step });

  const planLabel = ctx.plan?.steps[ctx.currentPlanStep]?.label ?? `Stap ${ctx.currentPlanStep + 1}`;
  ctx.failedPlanSteps.push({ label: planLabel, error: message });
  emitPlanProgress(ctx, ctx.currentPlanStep + 1, 'failed');

  if (!ctx.replanUsed && ctx.plan) {
    ctx.replanUsed = true;
    const revised = await planner.replan({
      command: ctx.input.command,
      parsedIntent: ctx.input.parsedIntent,
      currentPlan: ctx.plan,
      errorMessage: message,
      toolTrace: ctx.toolTrace,
      contextSnippets: ctx.input.contextSnippets,
      collectiveSnippets: ctx.input.collectiveSnippets,
      tenantId: ctx.input.tenantId,
      allowedTools: ctx.input.allowedTools,
      agentKey: ctx.input.agentKey,
      rolePrompt: ctx.input.rolePrompt,
    });
    ctx.plan = revised;
    ctx.planRevisions += 1;
    ctx.transcript.addPlan(revised);
    emitLoopEvent(ctx.onEvent, ctx.input.agentKey, {
      type: 'plan_revised',
      goal: revised.goal,
      steps: revised.steps,
      stepTotal: revised.steps.length,
      revision: revised.revision,
    });
    return 'replan';
  }

  return finalizeFailure(
    ctx,
    `Agent kon het doel niet voltooien. ${message}. Voltooide stappen: ${ctx.toolTrace.filter((t) => t.status !== 'error').map((t) => t.tool).join(', ') || 'geen'}.`
  );
}
