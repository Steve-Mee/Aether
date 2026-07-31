import type { LlmChatPort } from '../../../../shared/ai/LlmInferencePort';
import { mapBrainToolsToOllama } from '../../../../shared/ai/OllamaChatAdapter';
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

export interface NativeStepRunnerDeps {
  chatLlm: LlmChatPort;
  planner: BrainAgentPlanner;
  reflector: BrainAgentReflector;
  toolExecutor: LoopToolExecutor;
  checkCancelled: (input: AgentLoopRunInput, agentRunId?: string) => Promise<boolean>;
}

export async function runNativeChat(
  ctx: LoopContext,
  deps: NativeStepRunnerDeps
): Promise<AgentLoopOutput> {
  const { input, transcript, toolTrace, pendingActions, onEvent, agentRunId, startStep } = ctx;
  const { chatLlm, planner, reflector, toolExecutor, checkCancelled } = deps;

  const ollamaTools = mapBrainToolsToOllama(toolExecutor.getToolListForInput(input));
  const chatMessages = transcript.getMessages().map((m) => {
    if (m.role === 'tool') {
      return {
        role: 'tool' as const,
        content: m.output,
        tool_call_id: m.toolCallId,
        name: m.tool,
      };
    }
    if (m.role === 'proposal') {
      return { role: 'assistant' as const, content: `[proposal] ${m.summary}` };
    }
    if (m.role === 'plan') {
      const rev = m.revision ? ` rev${m.revision}` : '';
      const steps = m.steps.map((s) => `${s.index}. ${s.label}`).join('\n');
      return {
        role: 'system' as const,
        content: `Plan${rev}:\nDoel: ${m.goal}\n${steps}${m.reasoning ? `\nReden: ${m.reasoning}` : ''}`,
      };
    }
    if (m.role === 'reflection') {
      return { role: 'system' as const, content: `[reflection] ${m.observation}` };
    }
    return { role: m.role, content: m.content };
  });

  const maxStep = Math.min(startStep + MAX_AGENT_STEPS, MAX_TOTAL_STEPS);

  for (let step = startStep; step < maxStep; step++) {
    if (ctx.totalSteps >= MAX_TOTAL_STEPS) break;

    if (await checkCancelled(input, agentRunId)) {
      return buildCancelledOutput(ctx, agentRunId, input);
    }

    ctx.incTotalSteps();
    emitPlanProgress(ctx, ctx.currentPlanStep + 1, 'running');

    try {
      const response = await chatLlm.chat({
        messages: chatMessages,
        tools: ollamaTools,
        temperature: 0.2,
      });

      if (response.finishReason === 'stop' && response.message.content) {
        transcript.addAssistant(response.message.content);
        emitLoopEvent(onEvent, input.agentKey, {
          type: 'narrative_delta',
          narrative: response.message.content,
          step,
        });
        return finalizeSuccess(ctx, response.message.content, pendingActions[0]?.summary);
      }

      const toolCalls = response.message.tool_calls ?? [];
      if (toolCalls.length === 0) continue;

      transcript.addAssistant(response.message.content || `Calling ${toolCalls.length} tool(s)`);
      chatMessages.push({
        role: 'assistant',
        content: response.message.content,
        tool_calls: toolCalls,
      } as (typeof chatMessages)[0] & { tool_calls?: typeof toolCalls });

      for (const call of toolCalls) {
        const toolName = call.function.name;
        let toolInput: Record<string, unknown> = {};
        try {
          toolInput = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>;
        } catch {
          toolInput = {};
        }

        emitLoopEvent(onEvent, input.agentKey, { type: 'tool_start', step, tool: toolName });
        if (await checkCancelled(input, agentRunId)) {
          return buildCancelledOutput(ctx, agentRunId, input);
        }
        const toolResult = await toolExecutor.executeToolCall(toolName, toolInput, input, step, onEvent);

        if (toolResult.trace.status === 'error') {
          const errOutcome = await handleStepError(ctx, step, toolResult.output, planner);
          if (errOutcome === 'replan') continue;
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
          toolCallId: call.id,
          tool: toolName,
          output: toolResult.output,
          status: toolResult.trace.status,
        });
        chatMessages.push({
          role: 'tool',
          content: toolResult.output,
          tool_call_id: call.id,
          name: toolName,
        });
        advancePlanStep(ctx, 'done');

        const reflectOutcome = await reflectAfterTool(ctx, toolName, toolResult.output, reflector, planner);
        if (reflectOutcome && typeof reflectOutcome !== 'string') {
          return reflectOutcome;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Native chat step failed';
      const errOutcome = await handleStepError(ctx, step, message, planner);
      if (errOutcome === 'replan') continue;
      return errOutcome;
    }
  }

  return finalizeFailure(ctx, input.handlerResult);
}
