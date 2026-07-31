import type { CommandLogPort } from '../ports/CommandLogPort';
import type { AgentRuntimePort } from '../../../../ai/intelligence/agent-runtime/AgentRuntimePort';
import type { BrainResponseService } from '../../../../ai/intelligence/command-brain/BrainResponseService';
import type { CommandBrainService } from '../../../../ai/intelligence/command-brain/CommandBrainService';
import type { MerchantKnowledgeIndexer } from '../../../../ai/intelligence/merchant-knowledge/MerchantKnowledgeIndexer';
import { createInMemoryIntelligenceLayer } from '../../../../ai/intelligence/createIntelligenceLayer';
import type { PersonalBrainRegistry } from '../../../../ai/intelligence/personal-brain/PersonalBrainRegistry';
import type { BrainAdaptiveLearningService } from '../../../../ai/intelligence/command-brain/BrainAdaptiveLearningService';
import type { ExecuteBrainToolUseCase } from './ExecuteBrainToolUseCase';
import type { AgentStreamCallback } from '../../../../ai/intelligence/command-brain/AgentStreamEvents';
import { ExplainabilityCollector } from '../../../../ai/intelligence/explainability/ExplainabilityCollector';
import type { PlanMemoryService } from '../../../../ai/intelligence/command-brain/PlanMemoryService';
import type { PersonalBrainMemoryService } from '../../../../ai/intelligence/personal-brain/memory/PersonalBrainMemoryService';
import type { AgentSupervisorPort } from '../../../../ai/intelligence/multi-agent/AgentSupervisorPort';
import type { MultiAgentResultAggregator } from '../../../../ai/intelligence/multi-agent/MultiAgentResultAggregator';
import type { ReflectionExperimentService } from '../../../../ai/intelligence/personal-brain/reflection/experiments/ReflectionExperimentService';
import type { ReflectionMetricsRecorder } from '../../../../ai/intelligence/personal-brain/reflection/ReflectionMetricsRecorder';
import type { ReflectionDistillationService } from '../../../../ai/intelligence/global-knowledge/distillation/ReflectionDistillationService';
import type { GlobalBrainPort } from '../../../../ai/intelligence/global-brain/GlobalBrainPort';
import type { GlobalKnowledgeService } from '../../../../ai/intelligence/global-knowledge/GlobalKnowledgeService';
import type { KnowledgeTransferPort } from '../../../../ai/intelligence/knowledge-transfer/KnowledgeTransferPort';
import type { KnowledgeContributionService } from '../../../../ai/intelligence/knowledge-transfer/contribution/KnowledgeContributionService';
import { DefaultKnowledgeTransferGate } from '../../../../ai/intelligence/knowledge-transfer/DefaultKnowledgeTransferGate';
import type { AgentPatternSyncService } from '../../../../ai/intelligence/global-knowledge/agent-patterns/AgentPatternSyncService';
import type { SupplierMonitorPort } from '../ports/SupplierMonitorPort';
import type { AdminDataPort } from '../ports/AdminDataPort';
import { ALL_INTENT_HANDLERS } from '../intents/handlers';
import type { IntentHandlerDeps } from '../intents/types';
import { withServerSpan } from '../../../../shared/observability/sentry';
import { runSpecialistExecution } from './command/runSpecialistExecution';
import { postCommandSideEffects } from './command/postCommandSideEffects';
import { prepareCommandContext } from './command/prepareCommandContext';
import { resolveCommandIntent } from './command/resolveCommandIntent';
import { resolveCommandRouting } from './command/resolveCommandRouting';
import { runIntentHandler } from './command/runIntentHandler';
import { prepareSpecialistRun } from './command/prepareSpecialistRun';
import { finalizeCommandOutcome } from './command/finalizeCommandOutcome';

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
  runMemoryPromoter?: import('../../../../ai/intelligence/multi-agent/memory/RunMemoryPromoter').RunMemoryPromoter;
  runWorkingMemory?: import('../../../../ai/intelligence/multi-agent/memory/RunWorkingMemoryPort').RunWorkingMemoryPort;
  reflectionExperimentService?: ReflectionExperimentService;
  reflectionMetricsRecorder?: ReflectionMetricsRecorder;
  reflectionDistillationService?: ReflectionDistillationService;
  agentPatternSync?: AgentPatternSyncService;
  goalContextProvider?: import('../../../../ai/intelligence/goals/GoalContextProvider').GoalContextProvider;
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
  private runMemoryPromoter?: import('../../../../ai/intelligence/multi-agent/memory/RunMemoryPromoter').RunMemoryPromoter;
  private runWorkingMemory?: import('../../../../ai/intelligence/multi-agent/memory/RunWorkingMemoryPort').RunWorkingMemoryPort;
  private reflectionExperimentService?: ReflectionExperimentService;
  private reflectionMetricsRecorder?: ReflectionMetricsRecorder;
  private reflectionDistillationService?: ReflectionDistillationService;
  private agentPatternSync?: AgentPatternSyncService;
  private goalContextProvider?: import('../../../../ai/intelligence/goals/GoalContextProvider').GoalContextProvider;
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
    this.runMemoryPromoter = services.runMemoryPromoter;
    this.runWorkingMemory = services.runWorkingMemory;
    this.reflectionExperimentService = services.reflectionExperimentService;
    this.reflectionMetricsRecorder = services.reflectionMetricsRecorder;
    this.reflectionDistillationService = services.reflectionDistillationService;
    this.agentPatternSync = services.agentPatternSync;
    this.goalContextProvider = services.goalContextProvider;
  }

  async execute(
    naturalLanguage: string,
    ctx: {
      tenantId: string;
      actorId?: string;
      proactiveContext?: {
        agentKey?: string;
        intentId?: string;
        evidence?: Record<string, unknown>;
        detectionRunId?: string;
      };
    },
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
    ctx: {
      tenantId: string;
      actorId?: string;
      proactiveContext?: {
        agentKey?: string;
        intentId?: string;
        evidence?: Record<string, unknown>;
        detectionRunId?: string;
      };
    },
    options?: { onEvent?: AgentStreamCallback; abortSignal?: AbortSignal }
  ) {
    const explainCollector = new ExplainabilityCollector();
    const streamOptions = options
      ? { ...options, onEvent: explainCollector.wrap(options.onEvent) }
      : undefined;

    const prepared = await prepareCommandContext(
      {
        commandBrain: this.commandBrain,
        personalBrainMemory: this.personalBrainMemory,
        reflectionExperimentService: this.reflectionExperimentService,
        globalKnowledgeService: this.globalKnowledgeService,
        goalContextProvider: this.goalContextProvider,
      },
      {
        tenantId: ctx.tenantId,
        actorId: ctx.actorId,
        naturalLanguage,
        explainCollector,
        streamOptions,
      }
    );

    const intent = await resolveCommandIntent(
      { agentRuntime: this.agentRuntime },
      {
        tenantId: ctx.tenantId,
        actorId: ctx.actorId,
        naturalLanguage,
        contextSnippets: prepared.contextSnippets,
        memoryPromptBlock: prepared.memoryPromptBlock,
        workflowRunId: prepared.workflowRunId,
        proactiveContext: ctx.proactiveContext,
      }
    );

    const routing = await resolveCommandRouting(
      { agentSupervisor: this.agentSupervisor },
      {
        tenantId: ctx.tenantId,
        naturalLanguage,
        parsed: intent.parsed,
        streamOptions,
      }
    );

    const handlerOutcome = await runIntentHandler(
      {
        handlerMap: this.handlerMap,
        intentDeps: this.deps,
        adaptiveLearning: this.adaptiveLearning,
        merchantKnowledgeIndexer: this.merchantKnowledgeIndexer,
      },
      {
        tenantId: ctx.tenantId,
        actorId: ctx.actorId,
        naturalLanguage,
        parsed: intent.parsed,
        specialistWillHandle: routing.specialistWillHandle,
        multiAgentPlan: routing.multiAgentPlan,
        multiAgentParallel: routing.multiAgentParallel,
        routePlan: routing.routePlan,
        specialistDef: routing.specialistDef,
      }
    );

    const specialistPrep = await prepareSpecialistRun(
      {
        commandLog: this.commandLog,
        globalBrain: this.globalBrain,
        knowledgeTransfer: this.knowledgeTransfer,
        globalKnowledgeService: this.globalKnowledgeService,
        agentPatternSync: this.agentPatternSync,
        ktGate: this.ktGate,
      },
      {
        tenantId: ctx.tenantId,
        actorId: ctx.actorId,
        naturalLanguage,
        parsed: intent.parsed,
        handlerResult: handlerOutcome.handlerResult,
        contextSnippets: intent.contextSnippets,
        specialistDef: routing.specialistDef,
        delegationEnabled: routing.delegationEnabled,
        multiAgentPlan: routing.multiAgentPlan,
        streamOptions,
      }
    );

    const specialist = await runSpecialistExecution(
      {
        agentSupervisor: this.agentSupervisor,
        brainResponse: this.brainResponse,
        multiAgentResultAggregator: this.multiAgentResultAggregator,
        runMemoryPromoter: this.runMemoryPromoter,
      },
      {
        tenantId: ctx.tenantId,
        actorId: ctx.actorId,
        naturalLanguage,
        parsed: intent.parsed,
        handlerResult: handlerOutcome.handlerResult,
        contextSnippets: intent.contextSnippets,
        memoryPromptBlock: prepared.memoryPromptBlock,
        collectiveSnippets: specialistPrep.collective.allSnippets,
        deferToTools: handlerOutcome.deferToTools,
        settings: handlerOutcome.settings,
        delegationEnabled: routing.delegationEnabled,
        multiAgentPlan: routing.multiAgentPlan,
        routePlan: routing.routePlan,
        routeDecision: routing.routeDecision,
        specialistDef: routing.specialistDef,
        proactiveAgentKey: ctx.proactiveContext?.agentKey,
        proactiveIntentId: ctx.proactiveContext?.intentId,
        rootRunId: specialistPrep.rootRunId,
        streamOptions,
        explainCollector,
        abortSignal: options?.abortSignal,
      }
    );

    const sideEffects = await postCommandSideEffects(
      {
        planMemory: this.planMemory,
        personalBrainMemory: this.personalBrainMemory,
        agentSupervisor: this.agentSupervisor,
        reflectionMetricsRecorder: this.reflectionMetricsRecorder,
        reflectionDistillationService: this.reflectionDistillationService,
        knowledgeContributionService: this.knowledgeContributionService,
        executeBrainTool: this.executeBrainTool,
        adaptiveLearning: this.adaptiveLearning,
      },
      {
        tenantId: ctx.tenantId,
        actorId: ctx.actorId,
        naturalLanguage,
        parsedIntent: intent.parsed.intent,
        brainResponse: specialist.brainResponse,
        specialistMeta: specialist.specialistMeta,
        contextSnippets: intent.contextSnippets,
        rootRunId: specialistPrep.rootRunId,
        settings: handlerOutcome.settings,
        experimentVariantArm: prepared.experimentVariantArm,
      }
    );

    return finalizeCommandOutcome(
      {
        commandLog: this.commandLog,
        personalBrainMemory: this.personalBrainMemory,
        personalBrainRegistry: this.personalBrainRegistry,
        globalKnowledgeService: this.globalKnowledgeService,
      },
      {
        tenantId: ctx.tenantId,
        actorId: ctx.actorId,
        naturalLanguage,
        parsed: intent.parsed,
        handlerResult: handlerOutcome.handlerResult,
        operationalMeta: handlerOutcome.operationalMeta,
        deferToTools: handlerOutcome.deferToTools,
        brainResponse: specialist.brainResponse,
        specialistMeta: specialist.specialistMeta,
        specialistAgents: specialist.specialistAgents,
        specialistDef: routing.specialistDef,
        executionMode: specialist.executionMode,
        agentContributions: specialist.agentContributions,
        actionConflicts: specialist.actionConflicts,
        synthesisSource: specialist.synthesisSource,
        sharedMemorySummary: specialist.sharedMemorySummary,
        agentTranscripts: specialist.agentTranscripts,
        pendingActions: sideEffects.pendingActions,
        autoExecuted: sideEffects.autoExecuted,
        earlyCommandId: specialistPrep.earlyCommandId,
        rootRunId: specialistPrep.rootRunId,
        workflowRunId: intent.workflowRunId,
        contextSnippets: intent.contextSnippets,
        recallMatches: prepared.recallMatches,
        retrievalError: prepared.retrievalError,
        collectiveSnippetCount: specialistPrep.collective.allSnippets.length,
        globalKnowledgeMeta: prepared.globalKnowledgeMeta,
        knowledgeContributionNotice: sideEffects.knowledgeContributionNotice,
        memoryNotice: prepared.memoryNotice,
        reflectionNotice: prepared.reflectionNotice,
        reflectionStored: sideEffects.reflectionStored,
        memoryRecalled: prepared.memoryRecalled,
        explainCollector,
        agentResultActionProposal: intent.agentResult.actionProposal,
      }
    );
  }
}
