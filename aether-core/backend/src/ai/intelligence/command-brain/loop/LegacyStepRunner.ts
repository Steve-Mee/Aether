import type { LlmInferencePort } from '../../../../shared/ai/LlmInferencePort';
import type { BrainAgentPlanner } from '../BrainAgentPlanner';
import type { BrainAgentReflector } from '../BrainAgentReflector';
import type { AgentLoopOutput, AgentLoopRunInput } from '../AgentLoopTypes';
import type { LoopContext } from './LoopContext';
import { MAX_AGENT_STEPS, MAX_TOTAL_STEPS } from './LoopContext';
import { emitPlanProgress, advancePlanStep } from './PlanStepTracker';
import { emitLoopEvent } from './loopEvents';
import { buildCancelledOutput, finalizeSuccess, finalizeFailure } from './LoopOutcomes';
import { maybeCheckpoint } from './CheckpointManager';
import type { LoopToolExecutor } from './LoopToolExecutor';
import { handleStepError } from './StepErrorHandler';
import { reflectAfterTool } from './ReflectionGate';

export interface LegacyStepRunnerDeps {
  llm: LlmInferencePort;
  planner: BrainAgentPlanner;
  reflector: BrainAgentReflector;
  toolExecutor: LoopToolExecutor;
  checkCancelled: (input: AgentLoopRunInput, agentRunId?: string) => Promise<boolean>;
}

export async function runLegacyPrompt(
  ctx: LoopContext,
  deps: LegacyStepRunnerDeps
): Promise<AgentLoopOutput> {
  const { input, transcript, toolTrace, pendingActions, onEvent, agentRunId, startStep } = ctx;
  const { llm, planner, reflector, toolExecutor, checkCancelled } = deps;

  transcript.addSystem(toolExecutor.getSchemaPromptForInput(ctx.input));
  const messages = [transcript.toPromptBlock()];
  const maxStep = Math.min(startStep + MAX_AGENT_STEPS, MAX_TOTAL_STEPS);

  for (let step = startStep; step < maxStep; step++) {
    if (ctx.totalSteps >= MAX_TOTAL_STEPS) break;

    if (await checkCancelled(input, agentRunId)) {
      return buildCancelledOutput(ctx, agentRunId, input);
    }

    ctx.incTotalSteps();
    emitPlanProgress(ctx, ctx.currentPlanStep + 1, 'running');

    const prompt = `${messages.join('\n\n')}\n\nStep ${step + 1}: Call a tool or respond with { "final": { "narrative": "...", "actionProposal": "..." } }`;

    try {
      const text = await llm.generate({ prompt, temperature: 0.2 });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]) as {
        final?: { narrative?: string; actionProposal?: string };
        tool?: string;
        input?: Record<string, unknown>;
      };

      if (parsed.final?.narrative) {
        transcript.addAssistant(parsed.final.narrative);
        return finalizeSuccess(ctx, parsed.final.narrative, parsed.final.actionProposal);
      }

      if (parsed.tool) {
        if (await checkCancelled(input, agentRunId)) {
          return buildCancelledOutput(ctx, agentRunId, input);
        }
        emitLoopEvent(onEvent, input.agentKey, { type: 'tool_start', step, tool: parsed.tool });
        const toolResult = await toolExecutor.executeToolCall(
          parsed.tool,
          parsed.input ?? {},
          input,
          step,
          onEvent
        );

        if (toolResult.trace.status === 'error') {
          const errOutcome = await handleStepError(ctx, step, toolResult.output, planner);
          if (errOutcome === 'replan') {
            messages.push(transcript.toPromptBlock());
            continue;
          }
          return errOutcome;
        }

        toolTrace.push(toolResult.trace);
        if (toolResult.proposal) {
          pendingActions.push(toolResult.proposal);
          transcript.addProposal(toolResult.proposal);
          const checkpoint = await maybeCheckpoint(
            toolResult.proposal,
            input,
            agentRunId,
            step,
            ctx.totalSteps,
            transcript,
            onEvent,
            toolTrace,
            pendingActions,
            ctx
          );
          if (checkpoint) return checkpoint;
        }
        transcript.addToolResult({
          toolCallId: `step_${step}`,
          tool: parsed.tool,
          output: toolResult.output,
          status: toolResult.trace.status,
        });
        advancePlanStep(ctx, 'done');

        const reflectOutcome = await reflectAfterTool(ctx, parsed.tool, toolResult.output, reflector, planner);
        if (reflectOutcome && typeof reflectOutcome !== 'string') {
          return reflectOutcome;
        }
        if (reflectOutcome === 'conclude') {
          const promptConclude = `${messages.join('\n\n')}\n\nProvide final JSON: { "final": { "narrative": "...", "actionProposal": "..." } }`;
          try {
            const concludeText = await llm.generate({ prompt: promptConclude, temperature: 0.2 });
            const concludeMatch = concludeText.match(/\{[\s\S]*\}/);
            if (concludeMatch) {
              const concludeParsed = JSON.parse(concludeMatch[0]) as {
                final?: { narrative?: string; actionProposal?: string };
              };
              if (concludeParsed.final?.narrative) {
                transcript.addAssistant(concludeParsed.final.narrative);
                return finalizeSuccess(
                  ctx,
                  concludeParsed.final.narrative,
                  concludeParsed.final.actionProposal
                );
              }
            }
          } catch {
            /* fall through */
          }
        }

        messages.push(transcript.toPromptBlock());
        continue;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Agent step failed';
      const errOutcome = await handleStepError(ctx, step, message, planner);
      if (errOutcome === 'replan') {
        messages.push(transcript.toPromptBlock());
        continue;
      }
      return errOutcome;
    }
  }

  return finalizeFailure(ctx, input.handlerResult);
}
