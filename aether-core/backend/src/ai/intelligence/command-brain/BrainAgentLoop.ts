import type { LlmChatPort } from '../../../shared/ai/LlmInferencePort';
import { useNativeOllamaTools } from '../../../shared/ai/LlmInferencePort';
import type { LlmInferencePort } from '../../../shared/ai/LlmInferencePort';
import { defaultOllamaInference } from '../../../shared/ai/OllamaInferenceAdapter';
import { defaultOllamaChat } from '../../../shared/ai/OllamaChatAdapter';
import type { PersonalBrainToolRegistry } from '../personal-brain/tools/PersonalBrainToolRegistry';
import { getBrainToolProposal, getProposalExecutionResult } from '../personal-brain/tools/BrainToolProposalStore';
import type { BrainToolTraceEntry, ToolProposal } from '../personal-brain/tools/types';
import { AgentTranscript } from './AgentTranscript';
import { BrainAgentPlanner } from './BrainAgentPlanner';
import { BrainAgentReflector } from './BrainAgentReflector';
import type { PlanMemoryService } from './PlanMemoryService';
import type { AgentPlan } from './types/AgentPlan';
import {
  cancelBrainAgentRun,
  createBrainAgentRun,
  getBrainAgentRunById,
  parseResumeContext,
  updateBrainAgentRun,
  type AgentRunResumeContext,
} from './BrainAgentRunStore';
import type { AgentLoopOutput, AgentLoopRunInput } from './AgentLoopTypes';
import type { LoopContext } from './loop/LoopContext';
import { PLAN_FOLLOW_INSTRUCTION } from './loop/LoopContext';
import { emitLoopEvent } from './loop/loopEvents';
import { buildCancelledOutput } from './loop/LoopOutcomes';
import { LoopToolExecutor } from './loop/LoopToolExecutor';
import { runLegacyPrompt } from './loop/LegacyStepRunner';
import { runNativeChat } from './loop/NativeStepRunner';

export type { AgentLoopOutput, AgentLoopRunInput } from './AgentLoopTypes';

/**
 * Multi-step tool loop with explicit planning, shared AgentTranscript,
 * and checkpoint/resume for approval-gated steps.
 */
export class BrainAgentLoop {
  private planner: BrainAgentPlanner;
  private reflector: BrainAgentReflector;
  private toolExecutor: LoopToolExecutor;

  constructor(
    private tools: PersonalBrainToolRegistry,
    private llm: LlmInferencePort = defaultOllamaInference,
    private chatLlm: LlmChatPort = defaultOllamaChat,
    planner?: BrainAgentPlanner,
    reflector?: BrainAgentReflector
  ) {
    this.reflector = reflector ?? new BrainAgentReflector(llm);
    this.planner = planner ?? new BrainAgentPlanner(tools, llm);
    this.toolExecutor = new LoopToolExecutor(tools);
  }

  /** Retained for wiring compatibility; plan recall is via memoryPromptBlock. */
  setPlanMemory(_planMemory: PlanMemoryService): void {
    this.planner = new BrainAgentPlanner(this.tools, this.llm);
  }

  shouldUseAgentLoop(parsedIntent: string, deferToTools = false): boolean {
    if (deferToTools) return true;
    return ['PRICE_UPDATE', 'LOW_MARGIN_REPORT', 'UNKNOWN', 'COMPOUND_WORKFLOW'].includes(parsedIntent);
  }

  async resume(
    agentRunId: string,
    tenantId: string,
    options?: { memoryPromptBlock?: string }
  ): Promise<AgentLoopOutput> {
    const run = await getBrainAgentRunById(agentRunId, tenantId);
    if (!run || run.status !== 'awaiting_approval') {
      return { narrative: '', error: 'Agent run not resumable' };
    }
    const ctx = parseResumeContext(run.resumeContext);
    if (!ctx) {
      return { narrative: '', error: 'Missing resume context' };
    }
    let transcriptMessages: ReturnType<AgentTranscript['getMessages']>;
    try {
      transcriptMessages = AgentTranscript.fromJSON(JSON.parse(run.transcript)).getMessages();
    } catch {
      transcriptMessages = [];
    }

    if (run.pendingProposalId) {
      const proposal = await getBrainToolProposal(run.pendingProposalId, tenantId);
      if (proposal) {
        const executionOutput = getProposalExecutionResult(proposal);
        if (executionOutput) {
          transcriptMessages.push({
            role: 'tool',
            toolCallId: `approved_${run.pendingProposalId}`,
            tool: proposal.tool,
            output: executionOutput,
            status: 'ok',
          });
        }
      }
    }

    transcriptMessages.push({
      role: 'assistant',
      content: 'Goedkeuring ontvangen — agent hervat.',
    });

    return this.run({
      tenantId,
      command: ctx.command,
      parsedIntent: ctx.parsedIntent,
      parameters: {},
      contextSnippets: ctx.contextSnippets,
      handlerResult: ctx.handlerResult,
      memoryPromptBlock: options?.memoryPromptBlock ?? ctx.memoryPromptBlock,
      deferToTools: ctx.deferToTools,
      adaptiveLearningEnabled: ctx.adaptiveLearningEnabled,
      actorId: ctx.actorId,
      collectiveSnippets: ctx.collectiveSnippets,
      commandId: ctx.commandId ?? run.commandId ?? undefined,
      resumeState: {
        agentRunId: run.id,
        startStep: run.currentStep + 1,
        totalSteps: run.totalSteps,
        transcript: transcriptMessages,
      },
    });
  }

  async run(input: AgentLoopRunInput): Promise<AgentLoopOutput> {
    const toolTrace: BrainToolTraceEntry[] = [];
    const pendingActions: ToolProposal[] = [];
    const transcript = new AgentTranscript();

    const resumeState = input.resumeState;
    if (resumeState) {
      for (const msg of resumeState.transcript) {
        if (msg.role === 'system') transcript.addSystem(msg.content);
        else if (msg.role === 'user') transcript.addUser(msg.content);
        else if (msg.role === 'assistant') transcript.addAssistant(msg.content);
        else if (msg.role === 'tool') {
          transcript.addToolResult({
            toolCallId: msg.toolCallId,
            tool: msg.tool,
            output: msg.output,
            status: msg.status,
          });
        } else if (msg.role === 'proposal') {
          transcript.addProposal({
            proposalId: msg.proposalId,
            tool: msg.tool,
            summary: msg.summary,
            risk: msg.risk,
          });
        } else if (msg.role === 'plan') {
          transcript.addPlan({
            goal: msg.goal,
            steps: msg.steps,
            reasoning: msg.reasoning,
            revision: msg.revision,
            supersedes: msg.supersedes,
          });
        } else if (msg.role === 'reflection') {
          transcript.addReflection({
            observation: msg.observation,
            nextAction: msg.nextAction,
            planStep: msg.planStep,
          });
        }
      }
    } else {
      const agentLabel = input.agentKey && input.agentKey !== 'admin' ? input.agentKey : 'AETHER';
      transcript.addSystem(
        input.rolePrompt ??
          `Je bent ${agentLabel}, het persoonlijke brein van een e-commerce merchant. Intent: ${input.parsedIntent}.`
      );
      if (input.handoffConstraints?.length) {
        transcript.addSystem(`Delegation constraints:\n${input.handoffConstraints.map((c) => `- ${c}`).join('\n')}`);
      }
      if (input.collectiveSnippets?.length) {
        transcript.addSystem(
          `Collective insights:\n${input.collectiveSnippets.map((s) => `- ${s}`).join('\n')}`
        );
      }
      if (input.contextSnippets.length) {
        transcript.addSystem(
          `Context:\n${input.contextSnippets.map((s) => `- ${s}`).join('\n')}`
        );
      }
      if (input.memoryPromptBlock) {
        transcript.addSystem(input.memoryPromptBlock);
      }
      transcript.addUser(`Command: "${input.command}"\nHandler result: ${input.handlerResult}`);
      if (input.deferToTools) {
        transcript.addSystem(
          'Mutations: use updatePrice/syncSupplier (propose → Goedkeuringen inbox), createApproval (direct inbox), executeLowRiskAction (low-risk only), or createInsight.'
        );
      }
    }

    let agentRunId: string | undefined = resumeState?.agentRunId;
    const startStep = resumeState?.startStep ?? 0;
    let totalSteps = resumeState?.totalSteps ?? 0;
    let plan: AgentPlan | null = transcript.getPlan();
    let currentPlanStep = toolTrace.length;

    if (!plan && !resumeState) {
      plan = await this.planner.generatePlan({
        command: input.command,
        parsedIntent: input.parsedIntent,
        contextSnippets: input.contextSnippets,
        handlerResult: input.handlerResult,
        deferToTools: input.deferToTools,
        collectiveSnippets: input.collectiveSnippets,
        subGoals: input.subGoals,
        tenantId: input.tenantId,
        memoryPromptBlock: input.memoryPromptBlock,
        allowedTools: input.allowedTools,
        agentKey: input.agentKey,
        rolePrompt: input.rolePrompt,
      });
      transcript.addPlan(plan);
      transcript.addSystem(PLAN_FOLLOW_INSTRUCTION);
      emitLoopEvent(input.onEvent, input.agentKey, {
        type: 'plan_ready',
        goal: plan.goal,
        steps: plan.steps,
        stepTotal: plan.steps.length,
      });
    }

    if (!agentRunId && input.persistRun !== false) {
      const resumeContext: AgentRunResumeContext = {
        command: input.command,
        handlerResult: input.handlerResult,
        parsedIntent: input.parsedIntent,
        contextSnippets: input.contextSnippets,
        collectiveSnippets: input.collectiveSnippets,
        deferToTools: input.deferToTools,
        adaptiveLearningEnabled: input.adaptiveLearningEnabled,
        actorId: input.actorId,
        commandId: input.commandId,
        memoryPromptBlock: input.memoryPromptBlock,
      };
      const run = await createBrainAgentRun({
        tenantId: input.tenantId,
        commandId: input.commandId,
        transcript: transcript.getMessages(),
        resumeContext,
        agentKey: input.agentKey,
        parentRunId: input.parentRunId,
        delegationMeta: input.correlationId
          ? ({ correlationId: input.correlationId } as import('@prisma/client').Prisma.InputJsonValue)
          : undefined,
      });
      agentRunId = run.id;
    }

    emitLoopEvent(input.onEvent, input.agentKey, { type: 'thinking', step: startStep });

    const loopCtx: LoopContext = {
      input,
      transcript,
      toolTrace,
      pendingActions,
      onEvent: input.onEvent,
      agentRunId,
      startStep,
      get totalSteps() {
        return totalSteps;
      },
      incTotalSteps: () => {
        totalSteps += 1;
      },
      plan,
      currentPlanStep,
      replanUsed: false,
      failedPlanSteps: [],
      reflections: [],
      planRevisions: 0,
    };

    const cancelled = await this.checkCancelled(input, agentRunId);
    if (cancelled) {
      return buildCancelledOutput(loopCtx, agentRunId, input);
    }

    const nativeTools = useNativeOllamaTools();
    let result: AgentLoopOutput;

    if (nativeTools) {
      result = await runNativeChat(loopCtx, {
        chatLlm: this.chatLlm,
        planner: this.planner,
        reflector: this.reflector,
        toolExecutor: this.toolExecutor,
        checkCancelled: (runInput, runId) => this.checkCancelled(runInput, runId),
      });
    } else {
      result = await runLegacyPrompt(loopCtx, {
        llm: this.llm,
        planner: this.planner,
        reflector: this.reflector,
        toolExecutor: this.toolExecutor,
        checkCancelled: (runInput, runId) => this.checkCancelled(runInput, runId),
      });
    }

    if (agentRunId) {
      if (result.checkpoint) {
        // checkpoint already persisted
      } else {
        await updateBrainAgentRun({
          id: agentRunId,
          tenantId: input.tenantId,
          transcript: transcript.getMessages(),
          status:
            result.runStatus === 'cancelled'
              ? 'cancelled'
              : result.error || result.runStatus === 'failed'
                ? 'failed'
                : 'completed',
          commandId: input.commandId,
          currentStep: totalSteps,
          totalSteps,
        });
      }
    }

    if (!result.checkpoint) {
      emitLoopEvent(input.onEvent, input.agentKey, {
        type: 'done',
        narrative: result.narrative,
        runStatus: result.runStatus,
        summary: result.summary?.narrative,
      });
    }

    return {
      ...result,
      agentRunId,
      transcript: transcript.getMessages(),
      plan: plan ?? undefined,
    };
  }

  private async checkCancelled(
    input: AgentLoopRunInput,
    agentRunId?: string
  ): Promise<boolean> {
    if (input.abortSignal?.aborted) {
      if (agentRunId) {
        await cancelBrainAgentRun(agentRunId, input.tenantId);
      }
      return true;
    }
    if (!agentRunId) return false;
    const run = await getBrainAgentRunById(agentRunId, input.tenantId);
    return run?.status === 'cancelled';
  }
}

export { cancelBrainAgentRun };
