import type { LlmChatPort } from '../../../shared/ai/LlmInferencePort';
import { useNativeOllamaTools } from '../../../shared/ai/LlmInferencePort';
import type { LlmInferencePort } from '../../../shared/ai/LlmInferencePort';
import { defaultOllamaInference } from '../../../shared/ai/OllamaInferenceAdapter';
import { defaultOllamaChat, mapBrainToolsToOllama } from '../../../shared/ai/OllamaChatAdapter';
import type { GenerateResponseInput, GenerateResponseOutput } from './BrainResponseService';
import type { PersonalBrainToolRegistry } from '../personal-brain/tools/PersonalBrainToolRegistry';
import { getBrainToolProposal, getProposalExecutionResult } from '../personal-brain/tools/BrainToolProposalStore';
import type { BrainToolTraceEntry, ToolProposal } from '../personal-brain/tools/types';
import { AgentTranscript } from './AgentTranscript';
import type { AgentStreamCallback, StepProgressStatus, AgentStreamEvent } from './AgentStreamEvents';
import { emitStreamEvent } from './AgentStreamEvents';
import { BrainAgentPlanner } from './BrainAgentPlanner';
import { BrainAgentReflector } from './BrainAgentReflector';
import type { PlanMemoryService } from './PlanMemoryService';
import type { CompoundStep } from '../agent-runtime/types';
import type { ExplainabilityCollector } from '../explainability/ExplainabilityCollector';
import {
  buildAgentRunSummary,
  type AgentPlan,
  type AgentRunSummary,
} from './types/AgentPlan';
import {
  cancelBrainAgentRun,
  createBrainAgentRun,
  getBrainAgentRunById,
  parseResumeContext,
  updateBrainAgentRun,
  updateBrainAgentRunCheckpoint,
  type AgentRunResumeContext,
} from './BrainAgentRunStore';

const MAX_AGENT_STEPS = 5;
const MAX_TOTAL_STEPS = 10;

const PLAN_FOLLOW_INSTRUCTION =
  'Volg het plan. Na elke tool: evalueer of het doel bereikt is of ga naar de volgende stap. Bij falen: probeer alternatief of geef duidelijke foutmelding.';

function emitLoopEvent(
  onEvent: AgentStreamCallback | undefined,
  agentKey: string | undefined,
  event: Omit<AgentStreamEvent, 'timestamp'>
): void {
  emitStreamEvent(onEvent, agentKey ? { ...event, agentKey } : event);
}

export interface AgentLoopOutput extends GenerateResponseOutput {
  toolTrace?: BrainToolTraceEntry[];
  pendingActions?: ToolProposal[];
  autoExecuted?: Array<{ proposalId: string; result: string }>;
  agentRunId?: string;
  transcript?: ReturnType<AgentTranscript['getMessages']>;
  checkpoint?: boolean;
  awaitingApprovalId?: string;
  runStatus?: 'running' | 'completed' | 'failed' | 'awaiting_approval' | 'cancelled';
  plan?: AgentPlan;
  summary?: AgentRunSummary;
}

export interface AgentLoopRunInput extends GenerateResponseInput {
  tenantId: string;
  deferToTools?: boolean;
  adaptiveLearningEnabled?: boolean;
  actorId?: string;
  collectiveSnippets?: string[];
  onEvent?: AgentStreamCallback;
  commandId?: string;
  persistRun?: boolean;
  abortSignal?: AbortSignal;
  subGoals?: CompoundStep[];
  agentKey?: string;
  rolePrompt?: string;
  allowedTools?: string[];
  parentRunId?: string;
  handoffConstraints?: string[];
  peerDepth?: number;
  correlationId?: string;
  resumeState?: {
    agentRunId: string;
    startStep: number;
    totalSteps: number;
    transcript: ReturnType<AgentTranscript['getMessages']>;
  };
  explainabilityCollector?: ExplainabilityCollector;
}

interface LoopContext {
  input: AgentLoopRunInput;
  transcript: AgentTranscript;
  toolTrace: BrainToolTraceEntry[];
  pendingActions: ToolProposal[];
  onEvent?: AgentStreamCallback;
  agentRunId?: string;
  startStep: number;
  get totalSteps(): number;
  incTotalSteps: () => void;
  plan: AgentPlan | null;
  currentPlanStep: number;
  replanUsed: boolean;
  failedPlanSteps: Array<{ label: string; error?: string }>;
  reflections: string[];
  planRevisions: number;
}

/**
 * Multi-step tool loop with explicit planning, shared AgentTranscript,
 * and checkpoint/resume for approval-gated steps.
 */
export class BrainAgentLoop {
  private planner: BrainAgentPlanner;
  private reflector: BrainAgentReflector;

  constructor(
    private tools: PersonalBrainToolRegistry,
    private llm: LlmInferencePort = defaultOllamaInference,
    private chatLlm: LlmChatPort = defaultOllamaChat,
    planner?: BrainAgentPlanner,
    reflector?: BrainAgentReflector
  ) {
    this.reflector = reflector ?? new BrainAgentReflector(llm);
    this.planner = planner ?? new BrainAgentPlanner(tools, llm);
  }

  /** Retained for wiring compatibility; plan recall is via memoryPromptBlock. */
  setPlanMemory(_planMemory: import('./PlanMemoryService').PlanMemoryService): void {
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
    let plan = transcript.getPlan();
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
      return this.buildCancelledOutput(loopCtx, agentRunId, input);
    }

    const nativeTools = useNativeOllamaTools();
    let result: AgentLoopOutput;

    if (nativeTools) {
      result = await this.runNativeChat(loopCtx);
    } else {
      result = await this.runLegacyPrompt(loopCtx);
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

  private buildCancelledOutput(
    ctx: LoopContext,
    agentRunId: string | undefined,
    input: AgentLoopRunInput
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

  private emitPlanProgress(
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

  private advancePlanStep(ctx: LoopContext, status: StepProgressStatus): void {
    ctx.currentPlanStep += 1;
    this.emitPlanProgress(ctx, ctx.currentPlanStep, status);
  }

  private skipRemainingPlanSteps(ctx: LoopContext): void {
    if (!ctx.plan) return;
    while (ctx.currentPlanStep < ctx.plan.steps.length) {
      ctx.currentPlanStep += 1;
      this.emitPlanProgress(ctx, ctx.currentPlanStep, 'skipped');
    }
  }

  private finalizeSuccess(
    ctx: LoopContext,
    narrative: string,
    actionProposal?: string
  ): AgentLoopOutput {
    this.skipRemainingPlanSteps(ctx);
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

  private finalizeFailure(
    ctx: LoopContext,
    narrative: string
  ): AgentLoopOutput {
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

  private async handleStepError(
    ctx: LoopContext,
    step: number,
    message: string
  ): Promise<AgentLoopOutput | 'replan'> {
    ctx.toolTrace.push({ tool: 'agent_loop', input: { step }, output: message, status: 'error' });
    emitLoopEvent(ctx.onEvent, ctx.input.agentKey, { type: 'error', error: message, step });

    const planLabel = ctx.plan?.steps[ctx.currentPlanStep]?.label ?? `Stap ${ctx.currentPlanStep + 1}`;
    ctx.failedPlanSteps.push({ label: planLabel, error: message });
    this.emitPlanProgress(ctx, ctx.currentPlanStep + 1, 'failed');

    if (!ctx.replanUsed && ctx.plan) {
      ctx.replanUsed = true;
      const revised = await this.planner.replan({
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

    return this.finalizeFailure(
      ctx,
      `Agent kon het doel niet voltooien. ${message}. Voltooide stappen: ${ctx.toolTrace.filter((t) => t.status !== 'error').map((t) => t.tool).join(', ') || 'geen'}.`
    );
  }

  private async reflectAfterTool(
    ctx: LoopContext,
    tool: string,
    toolOutput: string
  ): Promise<AgentLoopOutput | 'conclude' | void> {
    if (!ctx.plan || !this.reflector.shouldReflect()) return;

    const reflection = await this.reflector.reflectStep({
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
      return this.finalizeSuccess(ctx, narrative);
    }

    if (reflection.nextAction === 'replan' && ctx.plan) {
      const revised = await this.planner.replan({
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

  private async runLegacyPrompt(ctx: LoopContext): Promise<AgentLoopOutput> {
    const { input, transcript, toolTrace, pendingActions, onEvent, agentRunId, startStep } = ctx;
    transcript.addSystem(this.getSchemaPromptForInput(ctx.input));
    const messages = [transcript.toPromptBlock()];
    const maxStep = Math.min(startStep + MAX_AGENT_STEPS, MAX_TOTAL_STEPS);

    for (let step = startStep; step < maxStep; step++) {
      if (ctx.totalSteps >= MAX_TOTAL_STEPS) break;

      if (await this.checkCancelled(input, agentRunId)) {
        return this.buildCancelledOutput(ctx, agentRunId, input);
      }

      ctx.incTotalSteps();
      this.emitPlanProgress(ctx, ctx.currentPlanStep + 1, 'running');

      const prompt = `${messages.join('\n\n')}\n\nStep ${step + 1}: Call a tool or respond with { "final": { "narrative": "...", "actionProposal": "..." } }`;

      try {
        const text = await this.llm.generate({ prompt, temperature: 0.2 });
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) continue;

        const parsed = JSON.parse(jsonMatch[0]) as {
          final?: { narrative?: string; actionProposal?: string };
          tool?: string;
          input?: Record<string, unknown>;
        };

        if (parsed.final?.narrative) {
          transcript.addAssistant(parsed.final.narrative);
          return this.finalizeSuccess(ctx, parsed.final.narrative, parsed.final.actionProposal);
        }

        if (parsed.tool) {
          if (await this.checkCancelled(input, agentRunId)) {
            return this.buildCancelledOutput(ctx, agentRunId, input);
          }
          emitLoopEvent(onEvent, input.agentKey, { type: 'tool_start', step, tool: parsed.tool });
          const toolResult = await this.executeToolCall(parsed.tool, parsed.input ?? {}, input, step, onEvent);

          if (toolResult.trace.status === 'error') {
            const errOutcome = await this.handleStepError(ctx, step, toolResult.output);
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
            const checkpoint = await this.maybeCheckpoint(
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
          this.advancePlanStep(ctx, 'done');

          const reflectOutcome = await this.reflectAfterTool(ctx, parsed.tool, toolResult.output);
          if (reflectOutcome && typeof reflectOutcome !== 'string') {
            return reflectOutcome;
          }
          if (reflectOutcome === 'conclude') {
            const promptConclude = `${messages.join('\n\n')}\n\nProvide final JSON: { "final": { "narrative": "...", "actionProposal": "..." } }`;
            try {
              const concludeText = await this.llm.generate({ prompt: promptConclude, temperature: 0.2 });
              const concludeMatch = concludeText.match(/\{[\s\S]*\}/);
              if (concludeMatch) {
                const concludeParsed = JSON.parse(concludeMatch[0]) as {
                  final?: { narrative?: string; actionProposal?: string };
                };
                if (concludeParsed.final?.narrative) {
                  transcript.addAssistant(concludeParsed.final.narrative);
                  return this.finalizeSuccess(
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
        const errOutcome = await this.handleStepError(ctx, step, message);
        if (errOutcome === 'replan') {
          messages.push(transcript.toPromptBlock());
          continue;
        }
        return errOutcome;
      }
    }

    return this.finalizeFailure(ctx, input.handlerResult);
  }

  private async runNativeChat(ctx: LoopContext): Promise<AgentLoopOutput> {
    const { input, transcript, toolTrace, pendingActions, onEvent, agentRunId, startStep } = ctx;
    const ollamaTools = mapBrainToolsToOllama(this.getToolListForInput(input));
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

      if (await this.checkCancelled(input, agentRunId)) {
        return this.buildCancelledOutput(ctx, agentRunId, input);
      }

      ctx.incTotalSteps();
      this.emitPlanProgress(ctx, ctx.currentPlanStep + 1, 'running');

      try {
        const response = await this.chatLlm.chat({
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
          return this.finalizeSuccess(ctx, response.message.content, pendingActions[0]?.summary);
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
          if (await this.checkCancelled(input, agentRunId)) {
            return this.buildCancelledOutput(ctx, agentRunId, input);
          }
          const toolResult = await this.executeToolCall(toolName, toolInput, input, step, onEvent);

          if (toolResult.trace.status === 'error') {
            const errOutcome = await this.handleStepError(ctx, step, toolResult.output);
            if (errOutcome === 'replan') continue;
            return errOutcome;
          }

          toolTrace.push(toolResult.trace);
          if (toolResult.proposal) {
            pendingActions.push(toolResult.proposal);
            transcript.addProposal(toolResult.proposal);
            const checkpoint = await this.maybeCheckpoint(
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
          this.advancePlanStep(ctx, 'done');

          const reflectOutcome = await this.reflectAfterTool(ctx, toolName, toolResult.output);
          if (reflectOutcome && typeof reflectOutcome !== 'string') {
            return reflectOutcome;
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Native chat step failed';
        const errOutcome = await this.handleStepError(ctx, step, message);
        if (errOutcome === 'replan') continue;
        return errOutcome;
      }
    }

    return this.finalizeFailure(ctx, input.handlerResult);
  }

  private async maybeCheckpoint(
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

  private async executeToolCall(
    tool: string,
    toolInput: Record<string, unknown>,
    input: AgentLoopRunInput,
    step: number,
    onEvent?: AgentStreamCallback
  ) {
    const result = await this.tools.execute(
      { tool, input: toolInput },
      {
        tenantId: input.tenantId,
        actorId: input.actorId,
        originalCommand: input.command,
        commandId: input.commandId,
        agentKey: input.agentKey,
        allowedTools: input.allowedTools,
        parentRunId: input.parentRunId,
        onEvent: onEvent ?? input.onEvent,
        peerDepth: input.peerDepth ?? 0,
      },
      {
        adaptiveLearningEnabled: input.adaptiveLearningEnabled,
        originalCommand: input.command,
      }
    );
    emitLoopEvent(onEvent, input.agentKey, {
      type: result.proposal ? 'proposal_ready' : 'tool_result',
      step,
      tool,
      output: result.output,
      proposalId: result.proposal?.proposalId,
      summary: result.proposal?.summary,
    });
    return result;
  }

  private getToolListForInput(input: AgentLoopRunInput) {
    if (input.allowedTools?.length) {
      return this.tools.listForAgent(input.agentKey ?? 'admin', input.allowedTools);
    }
    return this.tools.list();
  }

  private getSchemaPromptForInput(input: AgentLoopRunInput): string {
    if (input.allowedTools?.length) {
      return this.tools.getSchemaPromptForAgent(input.agentKey ?? 'admin', input.allowedTools);
    }
    return this.tools.getSchemaPrompt();
  }
}

export { cancelBrainAgentRun };
