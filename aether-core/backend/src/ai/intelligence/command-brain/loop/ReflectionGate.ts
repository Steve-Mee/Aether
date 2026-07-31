import type { BrainAgentPlanner } from '../BrainAgentPlanner';
import type { BrainAgentReflector } from '../BrainAgentReflector';
import type { AgentLoopOutput } from '../AgentLoopTypes';
import type { LoopContext } from './LoopContext';
import { emitLoopEvent } from './loopEvents';
import { finalizeSuccess } from './LoopOutcomes';

export async function reflectAfterTool(
  ctx: LoopContext,
  tool: string,
  toolOutput: string,
  reflector: BrainAgentReflector,
  planner: BrainAgentPlanner
): Promise<AgentLoopOutput | 'conclude' | void> {
  if (!ctx.plan || !reflector.shouldReflect()) return;

  const reflection = await reflector.reflectStep({
    command: ctx.input.command,
    plan: ctx.plan,
    planStepIndex: ctx.currentPlanStep,
    tool,
    toolOutput,
  });

  ctx.reflections.push(reflection.observation);
  ctx.transcript.addReflection({
    observation: reflection.observation,
    nextAction: reflection.nextAction,
    planStep: ctx.currentPlanStep,
  });
  emitLoopEvent(ctx.onEvent, ctx.input.agentKey, {
    type: 'reflection',
    observation: reflection.observation,
    nextAction: reflection.nextAction,
    planStep: ctx.currentPlanStep,
  });

  if (reflection.goalReached && reflection.nextAction === 'conclude') {
    const narrative = reflection.observation;
    ctx.transcript.addAssistant(narrative);
    return finalizeSuccess(ctx, narrative);
  }

  if (reflection.nextAction === 'replan' && ctx.plan) {
    const revised = await planner.replan({
      command: ctx.input.command,
      parsedIntent: ctx.input.parsedIntent,
      currentPlan: ctx.plan,
      reflection,
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
  }

  if (reflection.nextAction === 'conclude') {
    ctx.transcript.addSystem('Reflection: concludeer met een samenvattend antwoord.');
    return 'conclude';
  }
}
