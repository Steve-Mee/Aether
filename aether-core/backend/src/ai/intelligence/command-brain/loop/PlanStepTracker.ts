import type { StepProgressStatus } from '../AgentStreamEvents';
import type { LoopContext } from './LoopContext';
import { emitLoopEvent } from './loopEvents';

export function emitPlanProgress(
  ctx: LoopContext,
  planStep: number,
  status: StepProgressStatus
): void {
  emitLoopEvent(ctx.onEvent, ctx.input.agentKey, {
    type: 'step_progress',
    planStep,
    planStepTotal: ctx.plan?.steps.length,
    stepStatus: status,
  });
}

export function advancePlanStep(ctx: LoopContext, status: StepProgressStatus): void {
  ctx.currentPlanStep += 1;
  emitPlanProgress(ctx, ctx.currentPlanStep, status);
}

export function skipRemainingPlanSteps(ctx: LoopContext): void {
  if (!ctx.plan) return;
  while (ctx.currentPlanStep < ctx.plan.steps.length) {
    ctx.currentPlanStep += 1;
    emitPlanProgress(ctx, ctx.currentPlanStep, 'skipped');
  }
}
