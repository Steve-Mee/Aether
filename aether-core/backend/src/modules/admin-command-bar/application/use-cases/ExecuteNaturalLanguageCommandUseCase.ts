import type { CommandLogPort } from '../ports/CommandLogPort';
import { writeAuditLog } from '../../../../shared/audit/auditService';
import { orchestrator } from '../../../../ai/orchestrator/Orchestrator';
import { workflowEngine } from '../../../../ai/orchestrator/WorkflowEngine';
import { computeIncrementalRevenueUplift } from '../../../../ai/attribution/OutcomeEngine';
import type { AgentRuntimePort } from '../../../../ai/intelligence/agent-runtime/AgentRuntimePort';
import type { BrainResponseService } from '../../../../ai/intelligence/command-brain/BrainResponseService';
import type { CommandBrainService } from '../../../../ai/intelligence/command-brain/CommandBrainService';
import type { MerchantKnowledgeIndexer } from '../../../../ai/intelligence/merchant-knowledge/MerchantKnowledgeIndexer';
import { createInMemoryIntelligenceLayer } from '../../../../ai/intelligence/createIntelligenceLayer';
import type { PersonalBrainRegistry } from '../../../../ai/intelligence/personal-brain/PersonalBrainRegistry';
import type { BrainAdaptiveLearningService } from '../../../../ai/intelligence/command-brain/BrainAdaptiveLearningService';
import {
  isMutatingIntent,
  shouldDeferToTools,
} from '../../../../ai/intelligence/command-brain/BrainActionPolicyResolver';
import { linkProposalsToCommand } from '../../../../ai/intelligence/personal-brain/tools/BrainToolProposalStore';
import { updateBrainAgentRunCommandId } from '../../../../ai/intelligence/command-brain/BrainAgentRunStore';
import type { ToolProposal } from '../../../../ai/intelligence/personal-brain/tools/types';
import { shouldAutoExecuteProposal } from '../../../../ai/intelligence/command-brain/BrainAutoExecutePolicy';
import { shouldPolicyAutoExecuteProposal } from '../../../../ai/intelligence/command-brain/BrainPolicyAutoExecutePolicy';
import type { ExecuteBrainToolUseCase } from './ExecuteBrainToolUseCase';
import type { AgentStreamCallback } from '../../../../ai/intelligence/command-brain/AgentStreamEvents';
import { emitStreamEvent } from '../../../../ai/intelligence/command-brain/AgentStreamEvents';
import { HandoffChainCollector } from '../../../../ai/intelligence/multi-agent/peer/HandoffChainCollector';
import type { PlanMemoryService } from '../../../../ai/intelligence/command-brain/PlanMemoryService';
import type { PersonalBrainMemoryService } from '../../../../ai/intelligence/personal-brain/memory/PersonalBrainMemoryService';
import { resolveTrigger } from '../../../../ai/intelligence/personal-brain/reflection/ReflectionTriggerPolicy';
import { setReflectionExperimentOverride } from '../../../../ai/intelligence/personal-brain/reflection/ReflectionExperimentOverrides';
import type { AgentSupervisorPort } from '../../../../ai/intelligence/multi-agent/AgentSupervisorPort';
import { isNestedPlansEnabled } from '../../../../ai/intelligence/multi-agent/parallelConfig';
import { shouldDelegateFromAdmin, shouldSkipHandlerForSpecialist } from '../../../../ai/intelligence/multi-agent/delegationConfig';
import type { RouteSource, SpecialistMeta, AgentContribution, ActionConflict, SynthesisSource, SpecialistExecuteResult } from '../../../../ai/intelligence/multi-agent/types';
import type { AgentMessage } from '../../../../ai/intelligence/command-brain/AgentTranscript';

function collectAgentTranscripts(
  results: Array<Pick<SpecialistExecuteResult, 'transcript'>>,
  agentKeys: string[]
): Record<string, AgentMessage[]> | undefined {
  const map: Record<string, AgentMessage[]> = {};
  results.forEach((r, i) => {
    if (r.transcript?.length) {
      map[agentKeys[i] ?? `agent-${i}`] = r.transcript;
    }
  });
  return Object.keys(map).length > 0 ? map : undefined;
}
import type { MultiAgentResultAggregator } from '../../../../ai/intelligence/multi-agent/MultiAgentResultAggregator';
import type { ReflectionExperimentService } from '../../../../ai/intelligence/personal-brain/reflection/experiments/ReflectionExperimentService';
import type { ReflectionMetricsRecorder } from '../../../../ai/intelligence/personal-brain/reflection/ReflectionMetricsRecorder';
import type { ReflectionDistillationService } from '../../../../ai/intelligence/global-knowledge/distillation/ReflectionDistillationService';
import type { GlobalBrainPort } from '../../../../ai/intelligence/global-brain/GlobalBrainPort';
import type { GlobalKnowledgeService } from '../../../../ai/intelligence/global-knowledge/GlobalKnowledgeService';
import { buildCollectiveContext } from '../../../../ai/intelligence/global-knowledge/CollectiveContextBuilder';
import type { GlobalKnowledgeContextMeta } from '../../../../ai/intelligence/global-knowledge/types';
import type { KnowledgeTransferPort } from '../../../../ai/intelligence/knowledge-transfer/KnowledgeTransferPort';
import type { KnowledgeContributionService } from '../../../../ai/intelligence/knowledge-transfer/contribution/KnowledgeContributionService';
import { DefaultKnowledgeTransferGate } from '../../../../ai/intelligence/knowledge-transfer/DefaultKnowledgeTransferGate';
import type { AgentPatternSyncService } from '../../../../ai/intelligence/global-knowledge/agent-patterns/AgentPatternSyncService';
import { getMerchantSettings } from '../../../../shared/settings/TenantSettingsService';
import type { SupplierMonitorPort } from '../ports/SupplierMonitorPort';
import type { AdminDataPort } from '../ports/AdminDataPort';
import { ALL_INTENT_HANDLERS } from '../intents/handlers';
import type { IntentHandlerDeps } from '../intents/types';
import { SuggestionService } from '../services/SuggestionService';
import { withServerSpan } from '../../../../shared/observability/sentry';
import { extractKeywords } from '../../../../ai/intelligence/merchant-knowledge/extractKeywords';
import { prisma } from '../../../../shared/prisma/client';

function matchIntent(text: string): { intent: string; parameters?: Record<string, unknown> } | null {
  const lower = text.toLowerCase();
  if (/forecast|voorspel|demand/.test(lower)) return { intent: 'FORECAST' };
  if (/add|create|new/.test(lower) && /supplier|leverancier/.test(lower)) return { intent: 'SUPPLIER_CREATE' };
  if (/verify|billable/.test(lower) && /outcome|uplift/.test(lower)) return { intent: 'OUTCOME_VERIFY' };
  if (/email|mail|inbox/.test(lower) && /summary|overzicht|status/.test(lower)) return { intent: 'EMAIL_SUMMARY' };
  if (/outcome|uplift|attribution/.test(lower)) return { intent: 'OUTCOMES_REPORT' };
  if (/pending|openstaand/.test(lower) && /approval|goedkeuring/.test(lower)) return { intent: 'PENDING_APPROVALS' };
  if (/monitor.*supplier|supplier.*monitor/.test(lower)) return { intent: 'SUPPLIER_MONITOR' };
  if (/restock|aanvull|replenish|bestel.*voorraad|voorraad.*bestel/.test(lower)) {
    return { intent: 'RESTOCK_SUGGEST' };
  }
  if (/inventory|stock|voorraad/.test(lower)) return { intent: 'INVENTORY_STATUS' };
  if (/order|bestelling/.test(lower) && /status|overzicht/.test(lower)) return { intent: 'ORDER_STATUS' };
  if (/verhoog|raise|verlaag|lower|optimaliseer|optimize/.test(lower) && /prijs|price|prijzen|prices/.test(lower)) {
    const pctMatch = lower.match(/(\d+)\s*%/);
    const keywords = extractKeywords(text);
    if (/optimaliseer|optimize/.test(lower) && !pctMatch) {
      return { intent: 'PRICING_OPTIMIZE', parameters: { product: keywords.length >= 3 ? keywords : undefined } };
    }
    return {
      intent: 'PRICE_UPDATE',
      parameters: {
        percentage: pctMatch ? parseInt(pctMatch[1], 10) : 5,
        product: keywords.length >= 3 ? keywords : undefined,
      },
    };
  }
  if (/approve|goedkeur/.test(lower)) return { intent: 'APPROVE_CHANGES' };
  if (/margin|marge/.test(lower)) return { intent: 'LOW_MARGIN_REPORT' };
  return null;
}

export interface CommandBrainServices {
  agentRuntime: AgentRuntimePort;
  commandBrain?: CommandBrainService;
  brainResponse: BrainResponseService;
  personalBrainRegistry: PersonalBrainRegistry;
  merchantKnowledgeIndexer?: MerchantKnowledgeIndexer;
  adaptiveLearning?: BrainAdaptiveLearningService;
  executeBrainTool?: ExecuteBrainToolUseCase;
  globalBrain?: GlobalBrainPort;
  knowledgeTransfer?: KnowledgeTransferPort;
  knowledgeContributionService?: KnowledgeContributionService;
  globalKnowledgeService?: GlobalKnowledgeService;
  planMemory?: PlanMemoryService;
  personalBrainMemory?: PersonalBrainMemoryService;
  agentSupervisor?: AgentSupervisorPort;
  multiAgentResultAggregator?: MultiAgentResultAggregator;
  reflectionExperimentService?: ReflectionExperimentService;
  reflectionMetricsRecorder?: ReflectionMetricsRecorder;
  reflectionDistillationService?: ReflectionDistillationService;
  agentPatternSync?: AgentPatternSyncService;
}

function toolForIntent(intent: string): string {
  switch (intent) {
    case 'PRICE_UPDATE':
      return 'updatePrice';
    case 'SUPPLIER_MONITOR':
      return 'syncSupplier';
    case 'RESTOCK_SUGGEST':
      return 'suggestRestock';
    case 'APPROVE_CHANGES':
      return 'createApproval';
    default:
      return intent.toLowerCase();
  }
}

function deriveRiskFromProposals(proposals: ToolProposal[]): {
  riskBand?: 'low' | 'medium' | 'high';
  requiresApproval?: boolean;
} {
  if (proposals.length === 0) return {};
  const risks = proposals.map((p) => p.risk);
  const riskBand = risks.includes('high') ? 'high' : risks.includes('medium') ? 'medium' : 'low';
  return {
    riskBand,
    requiresApproval: proposals.some((p) => p.requiresApproval || p.risk === 'high'),
  };
}

export class ExecuteNaturalLanguageCommandUseCase {
  private handlerMap: Map<string, (typeof ALL_INTENT_HANDLERS)[0]>;
  private deps: IntentHandlerDeps;
  private agentRuntime: AgentRuntimePort;
  private commandBrain?: CommandBrainService;
  private brainResponse: BrainResponseService;
  private personalBrainRegistry: PersonalBrainRegistry;
  private merchantKnowledgeIndexer?: MerchantKnowledgeIndexer;
  private adaptiveLearning?: BrainAdaptiveLearningService;
  private executeBrainTool?: ExecuteBrainToolUseCase;
  private globalBrain?: GlobalBrainPort;
  private knowledgeTransfer?: KnowledgeTransferPort;
  private knowledgeContributionService?: KnowledgeContributionService;
  private globalKnowledgeService?: GlobalKnowledgeService;
  private planMemory?: PlanMemoryService;
  private personalBrainMemory?: PersonalBrainMemoryService;
  private agentSupervisor?: AgentSupervisorPort;
  private multiAgentResultAggregator?: MultiAgentResultAggregator;
  private reflectionExperimentService?: ReflectionExperimentService;
  private reflectionMetricsRecorder?: ReflectionMetricsRecorder;
  private reflectionDistillationService?: ReflectionDistillationService;
  private agentPatternSync?: AgentPatternSyncService;
  private ktGate = new DefaultKnowledgeTransferGate();

  constructor(
    supplierMonitor: SupplierMonitorPort,
    adminData: AdminDataPort,
    private commandLog: CommandLogPort,
    brainServices?: CommandBrainServices
  ) {
    this.deps = { supplierMonitor, adminData };
    this.handlerMap = new Map(ALL_INTENT_HANDLERS.map((h) => [h.intent, h]));

    const layer = createInMemoryIntelligenceLayer();
    const services = brainServices ?? {
      agentRuntime: layer.agentRuntime,
      brainResponse: layer.brainResponseService,
      personalBrainRegistry: layer.personalBrainRegistry,
    };

    this.agentRuntime = services.agentRuntime;
    this.commandBrain = services.commandBrain;
    this.brainResponse = services.brainResponse;
    this.personalBrainRegistry = services.personalBrainRegistry;
    this.merchantKnowledgeIndexer = services.merchantKnowledgeIndexer;
    this.adaptiveLearning = services.adaptiveLearning;
    this.executeBrainTool = services.executeBrainTool;
    this.globalBrain = services.globalBrain;
    this.knowledgeTransfer = services.knowledgeTransfer;
    this.knowledgeContributionService = services.knowledgeContributionService;
    this.globalKnowledgeService = services.globalKnowledgeService;
    this.planMemory = services.planMemory;
    this.personalBrainMemory = services.personalBrainMemory;
    this.agentSupervisor = services.agentSupervisor;
    this.multiAgentResultAggregator = services.multiAgentResultAggregator;
    this.reflectionExperimentService = services.reflectionExperimentService;
    this.reflectionMetricsRecorder = services.reflectionMetricsRecorder;
    this.reflectionDistillationService = services.reflectionDistillationService;
    this.agentPatternSync = services.agentPatternSync;
  }

  async execute(
    naturalLanguage: string,
    ctx: { tenantId: string; actorId?: string },
    options?: { onEvent?: AgentStreamCallback; abortSignal?: AbortSignal }
  ) {
    return withServerSpan(
      'command.execute',
      { tenantId: ctx.tenantId, actorId: ctx.actorId ?? 'unknown' },
      () => this.executeCommand(naturalLanguage, ctx, options)
    );
  }

  private async executeCommand(
    naturalLanguage: string,
    ctx: { tenantId: string; actorId?: string },
    options?: { onEvent?: AgentStreamCallback; abortSignal?: AbortSignal }
  ) {
    let workflowRunId: string | undefined;
    const handoffCollector = new HandoffChainCollector();
    const streamOptions = options
      ? { ...options, onEvent: handoffCollector.wrap(options.onEvent) }
      : undefined;
    const useOrchestratorPrepare = process.env.COMMAND_BRAIN_USE_ORCHESTRATOR === 'true';

    let contextSnippets: string[] = [];
    let recallMatches: Array<{ id: string; score: number }> = [];
    let retrievalError: string | undefined;
    let memoryPromptBlock = '';
    let memoryNotice: string | undefined;
    let reflectionNotice: string | undefined;
    let memoryRecalled: Array<{ summary: string; age: string; layer: 'short' | 'long'; kind?: string }> = [];

    let globalKnowledgeMeta: GlobalKnowledgeContextMeta | undefined;
    let experimentVariantArm: 'control' | 'treatment' = 'control';

    if (this.reflectionExperimentService) {
      try {
        const resolved = await this.reflectionExperimentService.resolveConfig(ctx.tenantId);
        experimentVariantArm = resolved.variantArm;
        setReflectionExperimentOverride(resolved.config);
      } catch {
        setReflectionExperimentOverride(null);
      }
    }

    if (this.globalKnowledgeService) {
      const syncResult = await this.globalKnowledgeService.syncForTenant(ctx.tenantId);
      globalKnowledgeMeta = this.globalKnowledgeService.buildContextMeta(syncResult);
      if (globalKnowledgeMeta && streamOptions?.onEvent) {
        emitStreamEvent(streamOptions.onEvent, {
          type: 'global_knowledge_synced',
          summary: globalKnowledgeMeta.message,
        });
      }
    }

    if (this.commandBrain) {
      if (useOrchestratorPrepare) {
        const orch = await orchestrator.execute({
          tenantId: ctx.tenantId,
          actorId: ctx.actorId,
          task: 'command.brain.prepare',
          input: { command: naturalLanguage },
        });
        contextSnippets = (orch.output.contextSnippets as string[]) ?? [];
        recallMatches = (orch.output.recallMatches as Array<{ id: string; score: number }>) ?? [];
        retrievalError = orch.output.retrievalError as string | undefined;
        workflowRunId = orch.runId;
      } else {
        const prepared = await this.commandBrain.prepareCommand({
          tenantId: ctx.tenantId,
          command: naturalLanguage,
          actorId: ctx.actorId,
        });
        contextSnippets = prepared.contextSnippets;
        recallMatches = prepared.recallMatches;
        retrievalError = prepared.retrievalError;
      }
    }

    if (this.personalBrainMemory) {
      try {
        const preliminaryIntent = matchIntent(naturalLanguage)?.intent;
        const memoryRecall = await this.personalBrainMemory.recallForCommand(
          ctx.tenantId,
          naturalLanguage,
          preliminaryIntent ? { intent: preliminaryIntent } : undefined
        );
        memoryPromptBlock = memoryRecall.promptBlock;
        memoryNotice = memoryRecall.userNotice;
        reflectionNotice = memoryRecall.reflectionNotice;
        memoryRecalled = memoryRecall.memoryRecalled;
      } catch {
        // Memory recall is best-effort
      }
    }

    const agentResult = await this.agentRuntime.processCommand({
      tenantId: ctx.tenantId,
      command: naturalLanguage,
      actorId: ctx.actorId,
      contextSnippets,
      memorySnippets: memoryPromptBlock ? [memoryPromptBlock] : undefined,
    });
    const parsedFromLlm = agentResult.parsed;
    const regexMatch = matchIntent(naturalLanguage);

    let parsed =
      parsedFromLlm.confidence >= 0.6 && parsedFromLlm.intent !== 'ERROR' && parsedFromLlm.intent !== 'UNKNOWN'
        ? { ...parsedFromLlm, action: parsedFromLlm.action ?? null }
        : regexMatch
          ? { ...regexMatch, action: null, confidence: 0.85, source: 'regex' as const }
          : parsedFromLlm.intent !== 'ERROR'
            ? { ...parsedFromLlm, action: parsedFromLlm.action ?? null, source: 'llm' as const }
            : { intent: 'UNKNOWN', action: null, parameters: {}, confidence: 0, source: 'none' as const };

    const isLowConfidence = parsed.confidence < 0.6 || parsed.intent === 'UNKNOWN';
    if (isLowConfidence && !workflowRunId) {
      workflowRunId = await workflowEngine.startRun(ctx.tenantId, 'command.brain', {
        command: naturalLanguage,
        reason: 'low_confidence',
      });
    }
    if (workflowRunId) {
      await workflowEngine.addStep(workflowRunId, 'retrieve', 'completed', {
        snippetCount: contextSnippets.length,
      });
      await workflowEngine.addStep(workflowRunId, 'parse', 'completed', {
        intent: parsed.intent,
        confidence: parsed.confidence,
      });
    }

    const delegationEnabled = this.agentSupervisor?.isDelegationEnabled() ?? false;

    let routePlan =
      delegationEnabled &&
      (parsed.intent !== 'COMPOUND_WORKFLOW' || isNestedPlansEnabled()) &&
      this.agentSupervisor?.routePlan
        ? await this.agentSupervisor.routePlan(parsed.intent, naturalLanguage, {
            confidence: parsed.confidence,
            tenantId: ctx.tenantId,
          })
        : null;

    let routeDecision =
      delegationEnabled && this.agentSupervisor?.routeDecision
        ? await this.agentSupervisor.routeDecision(parsed.intent, naturalLanguage, {
            confidence: parsed.confidence,
            tenantId: ctx.tenantId,
          })
        : null;

    const multiAgentPlan =
      routePlan && (routePlan.agents?.length ?? 0) > 1;
    const multiAgentParallel = routePlan?.mode === 'parallel';
    const multiAgentSequential = routePlan?.mode === 'sequential';

    const specialistDef =
      multiAgentPlan
        ? null
        : routeDecision?.agent ??
          (routePlan?.agents?.[0]?.agentKey && routeDecision?.agentKey === routePlan.agents[0].agentKey
            ? routeDecision.agent
            : null) ??
          (delegationEnabled && this.agentSupervisor?.route
            ? await this.agentSupervisor.route(parsed.intent, naturalLanguage, {
                confidence: parsed.confidence,
                onEvent: streamOptions?.onEvent,
              })
            : null);

    const specialistWillHandle =
      delegationEnabled &&
      (multiAgentPlan ||
        (specialistDef !== null && shouldSkipHandlerForSpecialist(parsed.intent, true)));

    let handlerResult = '';
    let operationalMeta: Record<string, unknown> | undefined;
    const handler = this.handlerMap.get(parsed.intent);

    const settings = await getMerchantSettings(ctx.tenantId);
    let learnedHint = null;
    if (settings.brainAdaptiveLearningEnabled && settings.brainActionMode === 'adaptive' && this.adaptiveLearning) {
      learnedHint = await this.adaptiveLearning.getLearnedPreference(ctx.tenantId, toolForIntent(parsed.intent));
    }
    const deferToTools =
      parsed.intent === 'COMPOUND_WORKFLOW' ?
        true
      : shouldDeferToTools({
          settings,
          intent: parsed.intent,
          confidence: parsed.confidence,
          learnedHint,
        });

    if (parsed.intent === 'COMPOUND_WORKFLOW') {
      const stepCount = parsed.compound?.steps.length ?? 0;
      handlerResult = `Compound workflow: ${stepCount} sub-stappen gedetecteerd — agent plant en voert uit.`;
    } else if (specialistWillHandle && multiAgentPlan) {
      const label =
        multiAgentParallel
          ? routePlan!.agents.map((a) => a.agentKey).join(' + ')
          : routePlan!.agents.map((a) => a.agentKey).join(' → ');
      handlerResult = `Multi-agent workflow: ${label}.`;
    } else if (specialistWillHandle) {
      handlerResult = `Specialist ${specialistDef!.agentKey} handles ${parsed.intent}.`;
    } else if (handler && !(deferToTools && isMutatingIntent(parsed.intent))) {
      const outcome = await handler.execute(
        naturalLanguage,
        parsed.parameters as Record<string, unknown> | undefined,
        ctx,
        this.deps
      );
      handlerResult = outcome.result;
      operationalMeta = outcome.operationalMeta;
    } else if (handler && deferToTools && isMutatingIntent(parsed.intent)) {
      handlerResult = `Actie "${parsed.intent}" klaargezet — bevestig het voorstel van het brein om uit te voeren.`;
    } else if (!handler) {
      handlerResult = `Command understood as ${parsed.intent}. No destructive action taken.`;
    }

    if (parsed.intent === 'PRICE_UPDATE' && this.merchantKnowledgeIndexer && !deferToTools) {
      this.merchantKnowledgeIndexer.invalidate(ctx.tenantId);
    }

    const agentPatternSnippets = this.agentPatternSync
      ? await this.agentPatternSync.getContextSnippets(ctx.tenantId, specialistDef?.agentKey)
      : [];

    const collective = await buildCollectiveContext({
      tenantId: ctx.tenantId,
      globalBrain: this.globalBrain,
      knowledgeTransfer: this.knowledgeTransfer,
      globalKnowledgeService: this.globalKnowledgeService,
      ktGate: this.ktGate,
      syncGlobalKnowledge: false,
      agentPatternSnippets,
    });

    let brainResponse: Awaited<ReturnType<BrainResponseService['generateResponse']>>;
    let specialistMeta: SpecialistMeta | undefined;
    let specialistAgents: SpecialistMeta[] | undefined;
    let executionMode: 'single' | 'sequential' | 'parallel' | undefined;
    let agentContributions: AgentContribution[] | undefined;
    let actionConflicts: ActionConflict[] | undefined;
    let synthesisSource: SynthesisSource | undefined;
    let multiAgentResultsForAggregation:
      | import('../../../../ai/intelligence/multi-agent/types').AgentBranchResult[]
      | import('../../../../ai/intelligence/multi-agent/types').SpecialistExecuteResult[]
      | undefined;
    let multiAgentKeysForAggregation: string[] | undefined;
    let agentTranscripts: Record<string, AgentMessage[]> | undefined;

    let earlyCommandId: string | undefined;
    if (streamOptions?.onEvent) {
      const early = await this.commandLog.save({
        tenantId: ctx.tenantId,
        command: naturalLanguage,
        intent: parsed.intent,
        result: handlerResult || 'Processing…',
        confidence: parsed.confidence,
        actor: ctx.actorId,
      });
      earlyCommandId = early.id;
      emitStreamEvent(streamOptions.onEvent, {
        type: 'run_started',
        commandId: early.id,
        runStatus: 'running',
      });
    }

    const abortSignal = options?.abortSignal;

    const compoundSteps = parsed.compound?.steps?.map((s) => ({
      intent: s.intent,
      command: s.command,
    }));

    const executionPlan =
      parsed.intent === 'COMPOUND_WORKFLOW' && delegationEnabled && this.agentSupervisor?.resolveExecutionPlan
        ? this.agentSupervisor.resolveExecutionPlan(
            naturalLanguage,
            parsed.intent,
            compoundSteps,
            parsed.compound?.connector ?? 'sequential'
          )
        : multiAgentPlan && routePlan
          ? routePlan
          : null;

    let compoundHandled = false;

    if (
      executionPlan &&
      executionPlan.agents.length > 0 &&
      this.agentSupervisor?.isGraphOrchestrationEnabled?.() &&
      this.agentSupervisor?.executeGraph
    ) {
      executionMode = executionPlan.mode;
      const graphResult = await this.agentSupervisor.executeGraph({
        tenantId: ctx.tenantId,
        command: naturalLanguage,
        intent: parsed.intent,
        subGoals: compoundSteps,
        contextSnippets,
        agents: executionPlan.agents.map((a) => ({
          agentKey: a.agentKey,
          intent: a.intent,
          contextSnippets,
        })),
        actorId: ctx.actorId,
        collectiveSnippets: collective.allSnippets,
        memoryPromptBlock: memoryPromptBlock || undefined,
        deferToTools: true,
        adaptiveLearningEnabled: settings.brainAdaptiveLearningEnabled,
        graphDefinition: executionPlan.graphDefinition,
        onEvent: streamOptions?.onEvent,
        abortSignal,
      });

      if (graphResult.mode === 'parallel' && graphResult.parallelResult) {
        compoundHandled = true;
        const parallelResult = graphResult.parallelResult;
        brainResponse = {
          narrative: parallelResult.mergedNarrative || handlerResult,
          toolTrace: parallelResult.mergedToolTrace,
          pendingActions: parallelResult.pendingActions,
          agentRunId: parallelResult.agentRunIds[0],
          checkpoint: parallelResult.checkpoint,
          runStatus: parallelResult.checkpoint ? 'awaiting_approval' : 'completed',
        };
        specialistAgents = parallelResult.results.map((r, i) => ({
          agentKey: executionPlan.agents[i]?.agentKey ?? 'admin',
          delegatedFrom: 'admin',
          specialistRunId: r.agentRunId,
          handoffSummary: r.handoffPackage?.summary,
          routingSource: 'intent' as RouteSource,
        }));
        specialistMeta = specialistAgents[0];
        multiAgentResultsForAggregation = parallelResult.results;
        multiAgentKeysForAggregation = executionPlan.agents.map((a) => a.agentKey);
      } else if (graphResult.sequentialResults?.length) {
        compoundHandled = true;
        const seqResults = graphResult.sequentialResults;
        const last = seqResults[seqResults.length - 1];
        brainResponse = {
          narrative: graphResult.mergedNarrative || handlerResult,
          toolTrace: seqResults.flatMap((r) => r.toolTrace ?? []),
          pendingActions: seqResults.flatMap((r) => r.pendingActions ?? []),
          agentRunId: last?.agentRunId,
          checkpoint: seqResults.some((r) => r.checkpoint),
          runStatus: seqResults.some((r) => r.checkpoint) ? 'awaiting_approval' : 'completed',
          plan: last?.plan,
          summary: last?.summary,
        };
        specialistAgents = seqResults.map((r, i) => ({
          agentKey: executionPlan.agents[i]?.agentKey ?? 'admin',
          delegatedFrom: 'admin',
          specialistRunId: r.agentRunId,
          handoffSummary: r.handoffPackage?.summary,
          routingSource: 'intent' as RouteSource,
        }));
        specialistMeta = specialistAgents[specialistAgents.length - 1];
        multiAgentResultsForAggregation = seqResults;
        multiAgentKeysForAggregation = executionPlan.agents.map((a) => a.agentKey);
      }
    }

    if (
      !compoundHandled &&
      executionPlan &&
      executionPlan.mode === 'parallel' &&
      executionPlan.agents.length > 0 &&
      this.agentSupervisor?.executeParallel
    ) {
      executionMode = 'parallel';
      compoundHandled = true;
      const parallelResult = await this.agentSupervisor.executeParallel({
        tenantId: ctx.tenantId,
        command: naturalLanguage,
        agents: executionPlan.agents.map((a) => ({
          agentKey: a.agentKey,
          intent: a.intent,
          contextSnippets,
        })),
        actorId: ctx.actorId,
        collectiveSnippets: collective.allSnippets,
        memoryPromptBlock: memoryPromptBlock || undefined,
        deferToTools: true,
        adaptiveLearningEnabled: settings.brainAdaptiveLearningEnabled,
        onEvent: streamOptions?.onEvent,
        abortSignal,
      });

      brainResponse = {
        narrative: parallelResult.mergedNarrative || handlerResult,
        toolTrace: parallelResult.mergedToolTrace,
        pendingActions: parallelResult.pendingActions,
        agentRunId: parallelResult.agentRunIds[0],
        checkpoint: parallelResult.checkpoint,
        runStatus: parallelResult.checkpoint ? 'awaiting_approval' : 'completed',
      };

      specialistAgents = parallelResult.results.map((r, i) => ({
        agentKey: executionPlan.agents[i]?.agentKey ?? 'admin',
        delegatedFrom: 'admin',
        specialistRunId: r.agentRunId,
        handoffSummary: r.handoffPackage?.summary,
        routingSource: (executionPlan.routingSource ?? 'intent') as RouteSource,
      }));
      specialistMeta = specialistAgents[0];
      multiAgentResultsForAggregation = parallelResult.results;
      multiAgentKeysForAggregation = executionPlan.agents.map((a) => a.agentKey);
    } else if (
      !compoundHandled &&
      executionPlan &&
      executionPlan.mode === 'sequential' &&
      executionPlan.agents.length > 0 &&
      this.agentSupervisor?.executeSequential
    ) {
      executionMode = 'sequential';
      compoundHandled = true;
      const seqResults = await this.agentSupervisor.executeSequential(
        executionPlan.agents.map((a) => ({
          tenantId: ctx.tenantId,
          agentKey: a.agentKey,
          intent: a.intent,
          command: a.command ?? naturalLanguage,
          contextSnippets,
          handlerResult: `Sequential sub-task: ${a.intent}`,
          actorId: ctx.actorId,
          collectiveSnippets: collective.allSnippets,
          memoryPromptBlock: memoryPromptBlock || undefined,
          deferToTools: true,
          adaptiveLearningEnabled: settings.brainAdaptiveLearningEnabled,
          onEvent: streamOptions?.onEvent,
          abortSignal,
        }))
      );

      const last = seqResults[seqResults.length - 1];
      brainResponse = {
        narrative: seqResults.map((r) => r.narrative).filter(Boolean).join('\n\n') || handlerResult,
        toolTrace: seqResults.flatMap((r) => r.toolTrace ?? []),
        pendingActions: seqResults.flatMap((r) => r.pendingActions ?? []),
        agentRunId: last?.agentRunId,
        checkpoint: seqResults.some((r) => r.checkpoint),
        runStatus: seqResults.some((r) => r.checkpoint) ? 'awaiting_approval' : 'completed',
        plan: last?.plan,
        summary: last?.summary,
      };

      specialistAgents = seqResults.map((r, i) => ({
        agentKey: executionPlan.agents[i]?.agentKey ?? 'admin',
        delegatedFrom: i === 0 ? 'admin' : (executionPlan.agents[i - 1]?.agentKey ?? 'admin'),
        specialistRunId: r.agentRunId,
        handoffSummary: r.handoffPackage?.summary,
        routingSource: (executionPlan.routingSource ?? 'intent') as RouteSource,
      }));
      specialistMeta = specialistAgents[specialistAgents.length - 1];
      multiAgentResultsForAggregation = seqResults;
      multiAgentKeysForAggregation = executionPlan.agents.map((a) => a.agentKey);
    } else if (specialistDef && this.agentSupervisor?.executeSpecialist) {
      executionMode = 'single';
      const primaryAgentKey = specialistDef.agentKey;
      const specialistResult = await this.agentSupervisor.executeSpecialist({
        tenantId: ctx.tenantId,
        agentKey: specialistDef.agentKey,
        intent: parsed.intent,
        command: naturalLanguage,
        contextSnippets,
        handlerResult,
        parameters: (parsed.parameters as Record<string, unknown>) ?? {},
        actorId: ctx.actorId,
        collectiveSnippets: collective.allSnippets,
        memoryPromptBlock: memoryPromptBlock || undefined,
        deferToTools: deferToTools || isMutatingIntent(parsed.intent),
        adaptiveLearningEnabled: settings.brainAdaptiveLearningEnabled,
        onEvent: streamOptions?.onEvent,
        abortSignal: options?.abortSignal,
      });

      brainResponse = {
        narrative: specialistResult.narrative || handlerResult,
        actionProposal: specialistResult.actionProposal,
        error: specialistResult.error,
        toolTrace: specialistResult.toolTrace,
        pendingActions: specialistResult.pendingActions,
        agentRunId: specialistResult.agentRunId,
        checkpoint: specialistResult.checkpoint,
        awaitingApprovalId: specialistResult.awaitingApprovalId,
        runStatus: specialistResult.runStatus,
        plan: specialistResult.plan,
        summary: specialistResult.summary,
      };

      specialistMeta = {
        agentKey: primaryAgentKey,
        delegatedFrom: 'admin',
        specialistRunId: specialistResult.agentRunId,
        handoffSummary: specialistResult.handoffPackage?.summary,
        routingSource: (routePlan?.routingSource ?? routeDecision?.source) as RouteSource | undefined,
      };
    } else {
      brainResponse = await this.brainResponse.generateResponse(
        {
          tenantId: ctx.tenantId,
          command: naturalLanguage,
          parsedIntent: parsed.intent,
          parameters: (parsed.parameters as Record<string, unknown>) ?? {},
          contextSnippets,
          handlerResult,
          memoryPromptBlock: memoryPromptBlock || undefined,
        },
        {
          deferToTools,
          adaptiveLearningEnabled: settings.brainAdaptiveLearningEnabled,
          actorId: ctx.actorId,
          collectiveSnippets: collective.allSnippets,
          onEvent: streamOptions?.onEvent,
          abortSignal: options?.abortSignal,
          subGoals: parsed.compound?.steps,
        }
      );
    }

    if (
      this.multiAgentResultAggregator &&
      multiAgentResultsForAggregation &&
      multiAgentKeysForAggregation &&
      multiAgentKeysForAggregation.length > 1
    ) {
      const aggregated = await this.multiAgentResultAggregator.aggregate({
        command: naturalLanguage,
        results: multiAgentResultsForAggregation,
        agentKeys: multiAgentKeysForAggregation,
        fallbackNarrative: brainResponse.narrative,
      });
      brainResponse = { ...brainResponse, narrative: aggregated.narrative };
      agentContributions = aggregated.perAgentContributions;
      actionConflicts = aggregated.conflicts;
      synthesisSource = aggregated.synthesisSource;
    }

    if (multiAgentResultsForAggregation && multiAgentKeysForAggregation) {
      agentTranscripts = collectAgentTranscripts(
        multiAgentResultsForAggregation,
        multiAgentKeysForAggregation
      );
    }

    if (
      this.planMemory &&
      brainResponse.summary?.goalReached &&
      brainResponse.plan &&
      !brainResponse.checkpoint
    ) {
      await this.planMemory.rememberPlan(ctx.tenantId, {
        command: naturalLanguage,
        plan: brainResponse.plan,
        summary: brainResponse.summary,
        toolTrace: brainResponse.toolTrace,
      });
    }

    let reflectionStored: string | undefined;
    let knowledgeContributionNotice: string | undefined;

    const delegationTarget = specialistMeta?.agentKey ?? this.agentSupervisor?.resolveTargetAgent(parsed.intent) ?? null;
    let reflectionAgentKey = delegationTarget ?? 'admin';

    if (
      !specialistMeta &&
      this.agentSupervisor?.isDelegationEnabled() &&
      brainResponse.agentRunId &&
      delegationTarget &&
      shouldDelegateFromAdmin(parsed.intent)
    ) {
      try {
        await this.agentSupervisor.delegate({
          tenantId: ctx.tenantId,
          targetAgentKey: delegationTarget,
          intent: parsed.intent,
          command: naturalLanguage,
          context: contextSnippets,
          parentRunId: brainResponse.agentRunId,
        });
      } catch {
        // Delegation is best-effort
      }
    }

    if (this.personalBrainMemory && brainResponse.summary && !brainResponse.checkpoint) {
      const toolsUsed = brainResponse.toolTrace?.length ?? 0;
      const usedAgentLoop =
        Boolean(brainResponse.agentRunId) ||
        Boolean(brainResponse.plan) ||
        toolsUsed > 0;
      const trigger = resolveTrigger({
        intent: parsed.intent,
        goalReached: brainResponse.summary.goalReached,
        toolsUsed,
        usedAgentLoop,
        checkpoint: Boolean(brainResponse.checkpoint),
      });

      if (trigger) {
        try {
          const reflectionResult = await this.personalBrainMemory.recordExperienceReflection({
            tenantId: ctx.tenantId,
            command: naturalLanguage,
            intent: parsed.intent,
            summary: brainResponse.summary,
            plan: brainResponse.plan,
            toolTrace: brainResponse.toolTrace,
            reflections: brainResponse.summary.reflections,
            trigger,
            usedAgentLoop,
            checkpoint: Boolean(brainResponse.checkpoint),
            agentKey: reflectionAgentKey,
          });
          if (reflectionResult?.memoryIds.length) {
            reflectionStored = 'Ik heb deze ervaring opgeslagen om later beter te handelen.';
          }

          if (reflectionResult?.reflection && this.reflectionMetricsRecorder) {
            try {
              await this.reflectionMetricsRecorder.recordGoalReached(
                ctx.tenantId,
                brainResponse.summary.goalReached,
                brainResponse.agentRunId,
                experimentVariantArm
              );
              if (delegationTarget) {
                await this.reflectionMetricsRecorder.recordDelegationSuccess(
                  ctx.tenantId,
                  brainResponse.summary.goalReached,
                  brainResponse.agentRunId,
                  experimentVariantArm
                );
              }
            } catch {
              // Metrics are best-effort
            }
          }

          if (reflectionResult?.reflection && this.knowledgeContributionService) {
            try {
              const reflectionContribution =
                await this.knowledgeContributionService.contributeFromReflection(
                  ctx.tenantId,
                  reflectionResult.reflection
                );
              if (reflectionContribution.notice && !knowledgeContributionNotice) {
                knowledgeContributionNotice = reflectionContribution.notice;
              }
            } catch {
              // Reflection contribution is best-effort
            }
          }
        } catch {
          // Reflection memory is best-effort
        }
      }
    }

    if (this.reflectionDistillationService && brainResponse.runStatus === 'completed') {
      try {
        await this.reflectionDistillationService.distillFromReflections(ctx.tenantId);
      } catch {
        // Distillation is best-effort
      }
    }

    setReflectionExperimentOverride(null);

    if (
      this.knowledgeContributionService &&
      brainResponse.runStatus === 'completed' &&
      brainResponse.summary?.goalReached &&
      (brainResponse.toolTrace?.length ?? 0) >= 2
    ) {
      try {
        const contribution = await this.knowledgeContributionService.contributeFromAgentRun(
          ctx.tenantId,
          {
            parsedIntent: parsed.intent,
            summary: brainResponse.summary,
            toolTrace: brainResponse.toolTrace ?? [],
            goalReached: true,
          }
        );
        knowledgeContributionNotice = contribution.notice;
      } catch {
        // best-effort contribution
      }
    }

    let pendingActions = brainResponse.pendingActions ?? [];
    const autoExecuted: Array<{ proposalId: string; result: string }> = [];

    if (this.executeBrainTool && settings.brainAdaptiveAutoExecuteEnabled) {
      const remaining: ToolProposal[] = [];
      for (const proposal of pendingActions) {
        const learnedPreference = this.adaptiveLearning
          ? await this.adaptiveLearning.getLearnedPreference(ctx.tenantId, proposal.tool)
          : null;
        const autoCheck = await shouldAutoExecuteProposal({
          tenantId: ctx.tenantId,
          settings,
          proposal,
          learnedPreference,
        });
        if (autoCheck.eligible) {
          const exec = await this.executeBrainTool.execute(proposal.proposalId, {
            tenantId: ctx.tenantId,
            actorId: ctx.actorId ?? 'aether',
          });
          if (exec.success) {
            autoExecuted.push({ proposalId: proposal.proposalId, result: exec.message });
            await writeAuditLog({
              tenantId: ctx.tenantId,
              module: 'admin-command-bar',
              action: 'brain_tool_auto_executed',
              actor: ctx.actorId ?? 'aether',
              details: { proposalId: proposal.proposalId, tool: proposal.tool },
            });
            continue;
          }
        }
        remaining.push(proposal);
      }
      pendingActions = remaining;
    }

    if (this.executeBrainTool && settings.policyEnabled) {
      const remaining: ToolProposal[] = [];
      for (const proposal of pendingActions) {
        const policyCheck = await shouldPolicyAutoExecuteProposal({
          tenantId: ctx.tenantId,
          settings,
          proposal,
        });
        if (policyCheck.eligible) {
          const exec = await this.executeBrainTool.execute(proposal.proposalId, {
            tenantId: ctx.tenantId,
            actorId: ctx.actorId ?? 'aether',
          });
          if (exec.success) {
            autoExecuted.push({ proposalId: proposal.proposalId, result: exec.message });
            await writeAuditLog({
              tenantId: ctx.tenantId,
              module: 'admin-command-bar',
              action: 'brain_tool_auto_executed',
              actor: ctx.actorId ?? 'aether',
              details: {
                proposalId: proposal.proposalId,
                tool: proposal.tool,
                via: 'tenant_policy',
                reason: policyCheck.reason,
              },
            });
            continue;
          }
        }
        remaining.push(proposal);
      }
      pendingActions = remaining;
    }

    const result = brainResponse.narrative || handlerResult;
    const uplift = await computeIncrementalRevenueUplift(ctx.tenantId);
    const { riskBand, requiresApproval } = deriveRiskFromProposals(pendingActions);
    const handlerExecuted = !(deferToTools && isMutatingIntent(parsed.intent));
    const undoable = handlerExecuted && SuggestionService.isUndoableIntent(parsed.intent);

    const saved = earlyCommandId
      ? await prisma.command
          .update({
            where: { id: earlyCommandId },
            data: {
              result,
              intent: parsed.intent,
              confidence: parsed.confidence,
            },
          })
          .then((row) => ({
            id: row.id,
            command: row.command,
            result: row.result,
            intent: row.intent,
            confidence: row.confidence,
            createdAt: row.createdAt,
          }))
      : await this.commandLog.save(
      {
        tenantId: ctx.tenantId,
        command: naturalLanguage,
        intent: parsed.intent,
        result,
        confidence: parsed.confidence,
        actor: ctx.actorId,
        operationalMeta,
      },
      undoable
        ? {
            undoable: true,
            undoExpiresAt: SuggestionService.undoExpiresAtFromNow(),
          }
        : undefined
    );

    let brainMemoryId: string | undefined;
    if (this.personalBrainMemory) {
      try {
        brainMemoryId = await this.personalBrainMemory.recordOutcome({
          tenantId: ctx.tenantId,
          command: naturalLanguage,
          intent: parsed.intent,
          outcome: result,
          success: brainResponse.error == null,
          confidence: parsed.confidence,
          commandId: saved.id,
          goalReached: brainResponse.summary?.goalReached,
          verifiedUplift: uplift,
          toolsUsed: brainResponse.toolTrace?.length,
        });
        if (brainMemoryId) {
          await prisma.command.update({
            where: { id: saved.id },
            data: { brainMemoryId },
          });
        }
      } catch {
        // Memory write is best-effort
      }
    } else {
      try {
        const brain = this.personalBrainRegistry.get(ctx.tenantId, 'admin');
        brainMemoryId = await brain.remember({
          command: naturalLanguage,
          intent: parsed.intent,
          result,
        });
        if (brainMemoryId) {
          await prisma.command.update({
            where: { id: saved.id },
            data: { brainMemoryId },
          });
        }
      } catch {
        // Memory write is best-effort
      }
    }

    if (workflowRunId) {
      await workflowEngine.addStep(workflowRunId, 'respond', 'completed', {
        hasToolTrace: Boolean(brainResponse.toolTrace?.length),
      });
      if (brainMemoryId) {
        await workflowEngine.addStep(workflowRunId, 'remember', 'completed', { brainMemoryId });
      }
    }

    if (pendingActions.length > 0) {
      await linkProposalsToCommand(
        pendingActions.map((p) => p.proposalId),
        saved.id
      );
      await writeAuditLog({
        tenantId: ctx.tenantId,
        module: 'admin-command-bar',
        action: 'brain_tool_proposed',
        actor: ctx.actorId,
        details: {
          commandId: saved.id,
          proposals: pendingActions.map((p) => ({
            id: p.proposalId,
            tool: p.tool,
            risk: p.risk,
            approvalId: p.approvalId,
            confidence: p.confidence,
            expectedImpact: p.expectedImpact,
          })),
        },
      });
    }

    if (brainResponse?.agentRunId) {
      await updateBrainAgentRunCommandId(brainResponse.agentRunId, ctx.tenantId, saved.id);
    }

    await writeAuditLog({
      tenantId: ctx.tenantId,
      module: 'admin-command-bar',
      action: 'command_executed',
      actor: ctx.actorId,
      details: { intent: parsed.intent, result, verifiedUplift: uplift, workflowRunId },
    });

    await orchestrator.execute({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      task: 'admin.command',
      input: { intent: parsed.intent, command: naturalLanguage },
    });

    if (this.globalKnowledgeService && brainResponse.summary?.goalReached) {
      await this.globalKnowledgeService
        .getExperimentService()
        .recordOutcome(ctx.tenantId, 'goal_reached', 1);
    }
    if (this.globalKnowledgeService && uplift != null) {
      await this.globalKnowledgeService
        .getExperimentService()
        .recordOutcome(ctx.tenantId, 'uplift', uplift);
    }

    const brainErrors = [retrievalError, brainResponse.error].filter(Boolean);

    return {
      success: true,
      originalCommand: naturalLanguage,
      parsedIntent: parsed.intent,
      action: parsed.action,
      result,
      confidence: parsed.confidence,
      verifiedUplift: uplift,
      timestamp: new Date().toISOString(),
      commandId: saved.id,
      undoable,
      undoExpiresAt: undoable ? SuggestionService.undoExpiresAtFromNow().toISOString() : undefined,
      requiresApproval,
      riskBand,
      brain: {
        contextSnippets,
        recallMatches,
        actionProposal: brainResponse.actionProposal ?? agentResult.actionProposal,
        recallCount: contextSnippets.length,
        toolTrace: brainResponse.toolTrace,
        pendingActions,
        autoExecuted: autoExecuted.length > 0 ? autoExecuted : undefined,
        agentRunId: brainResponse.agentRunId,
        transcript: brainResponse.transcript,
        workflowRunId,
        error: brainErrors.length > 0 ? brainErrors.join('; ') : undefined,
        checkpoint: brainResponse.checkpoint,
        awaitingApprovalId: brainResponse.awaitingApprovalId,
        runStatus: brainResponse.runStatus,
        plan: brainResponse.plan,
        summary: brainResponse.summary,
        globalKnowledge: globalKnowledgeMeta,
        knowledgeContributionNotice,
        memoryNotice,
        reflectionNotice,
        reflectionStored,
        memoryRecalled: memoryRecalled.length > 0 ? memoryRecalled : undefined,
        specialist: specialistMeta,
        agents: specialistAgents,
        executionMode,
        handoffChain: handoffCollector.snapshot().length > 0 ? handoffCollector.snapshot() : undefined,
        agentContributions,
        actionConflicts,
        synthesisSource,
        agentTranscripts,
      },
    };
  }
}
