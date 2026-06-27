import { CommandParserService } from '../../modules/admin-command-bar/application/services/CommandParserService';
import type { AdminDataPort } from '../../modules/admin-command-bar/application/ports/AdminDataPort';
import type { SubmitInsightUseCase } from '../../modules/zero-knowledge-hive-mind/application/use-cases/SubmitInsightUseCase';
import type { QueryInsightsUseCase } from '../../modules/zero-knowledge-hive-mind/application/use-cases/QueryInsightsUseCase';
import type { PrivacyBudgetService } from '../../modules/zero-knowledge-hive-mind/application/services/HiveMindServices';
import { BrainMemoryService } from './brain-memory/BrainMemoryService';
import { AgentRuntime } from './agent-runtime/AgentRuntime';
import type { AgentRuntimePort } from './agent-runtime/AgentRuntimePort';
import { HiveMindGlobalBrain } from './global-brain/HiveMindGlobalBrain';
import type { GlobalBrainPort } from './global-brain/GlobalBrainPort';
import { PlaceholderGlobalBrain } from './global-brain/PlaceholderGlobalBrain';
import { LoRAPatchAdapter } from './global-knowledge/adapters/LoRAPatchAdapter';
import { VectorDistillationAdapter } from './global-knowledge/adapters/VectorDistillationAdapter';
import { CompositeGlobalKnowledgePort } from './global-knowledge/CompositeGlobalKnowledgePort';
import type { GlobalKnowledgePort } from './global-knowledge/GlobalKnowledgePort';
import { GlobalKnowledgeAdminService } from './global-knowledge/GlobalKnowledgeAdminService';
import { GlobalKnowledgeService } from './global-knowledge/GlobalKnowledgeService';
import { HiveMindGlobalKnowledgeAdapter } from './global-knowledge/HiveMindGlobalKnowledgeAdapter';
import { PrismaGlobalKnowledgeCatalog } from './global-knowledge/PrismaGlobalKnowledgeCatalog';
import { StaticGlobalKnowledgeCatalog } from './global-knowledge/StaticGlobalKnowledgeCatalog';
import { KnowledgeDistillationService } from './global-knowledge/distillation/KnowledgeDistillationService';
import {
  CrossTenantSubmitPipeline,
  FederatedQueryUseCase,
} from './global-knowledge/federated/FederatedQueryUseCase';
import { FederatedGlobalKnowledgeAdapter } from './global-knowledge/federated/FederatedGlobalKnowledgeAdapter';
import { HiveMindKnowledgeTransferAdapter } from './knowledge-transfer/HiveMindKnowledgeTransferAdapter';
import type { KnowledgeTransferPort } from './knowledge-transfer/KnowledgeTransferPort';
import { KnowledgeTransferService } from './knowledge-transfer/KnowledgeTransferService';
import type { AgentStatePort } from './personal-brain/AgentStatePort';
import { FilesystemLoRAAdapter } from './personal-brain/FilesystemLoRAAdapter';
import { InMemoryLoRAAdapter } from './personal-brain/InMemoryLoRAAdapter';
import type { LoRAAdapterRegistryPort } from './personal-brain/LoRAAdapterRegistryPort';
import {
  InMemoryAgentStateAdapter,
  PrismaAgentStateAdapter,
} from './personal-brain/PrismaAgentStateAdapter';
import { PersonalBrainRegistry } from './personal-brain/PersonalBrainRegistry';
import type { EmbeddingPort } from './vector-store/EmbeddingPort';
import { createProductionEmbedding } from './vector-store/ResilientEmbeddingAdapter';
import { SimpleHashEmbeddingAdapter } from './vector-store/SimpleHashEmbeddingAdapter';
import { InMemoryVectorStoreAdapter } from './vector-store/adapters/InMemoryVectorStoreAdapter';
import { resolveVectorStore } from './vector-store/TenantRoutingVectorStoreAdapter';
import type { VectorStorePort } from './vector-store/VectorStorePort';
import { BrainResponseService } from './command-brain/BrainResponseService';
import { CommandBrainService } from './command-brain/CommandBrainService';
import { MerchantKnowledgeIndexer } from './merchant-knowledge/MerchantKnowledgeIndexer';
import { ContextRetriever } from './retrieval/ContextRetriever';
import { BrainAgentLoop } from './command-brain/BrainAgentLoop';
import { BrainAdaptiveLearningService } from './command-brain/BrainAdaptiveLearningService';
import { PlanMemoryService } from './command-brain/PlanMemoryService';
import { PersonalBrainMemoryService } from './personal-brain/memory/PersonalBrainMemoryService';
import { ReflectionAdaptiveHintService } from './personal-brain/reflection/adaptive/ReflectionAdaptiveHintService';
import { ReflectionHandoffService } from './personal-brain/reflection/ReflectionHandoffService';
import { ReflectionHandoffStore } from './personal-brain/reflection/ReflectionHandoffStore';
import { ReflectionExperimentService } from './personal-brain/reflection/experiments/ReflectionExperimentService';
import { ReflectionMetricsRecorder } from './personal-brain/reflection/ReflectionMetricsRecorder';
import { ReflectionDistillationService } from './global-knowledge/distillation/ReflectionDistillationService';
import { AgentOrchestrator } from './multi-agent/AgentSupervisorOrchestrator';
import type { AgentSupervisorPort } from './multi-agent/AgentSupervisorPort';
import { AgentRegistry } from './multi-agent/AgentRegistry';
import { AgentRouterService } from './multi-agent/AgentRouterService';
import { ParallelCoordinator } from './multi-agent/ParallelCoordinator';
import { SpecialistAgentRunner } from './multi-agent/SpecialistAgentRunner';
import { NativeGraphOrchestrator } from './multi-agent/graph/NativeGraphOrchestrator';
import { LangGraphOrchestrator } from './multi-agent/graph/LangGraphOrchestrator';
import {
  DEFAULT_SPECIALIST_AGENTS,
  analyzeMarginsTool,
  suggestOptimalPriceTool,
  createSupplierTool,
  getInventoryStatusTool,
  listLowStockTool,
  suggestRestockTool,
  getEmailSummaryTool,
} from './multi-agent/agents';
import type { DynamicPricingEngine } from '../../modules/inventory-pricing/application/services/DynamicPricingEngine';
import { createMemoryConsolidationJob } from './personal-brain/memory/jobs/MemoryConsolidationJob';
import { PersonalBrainToolRegistry } from './personal-brain/tools/PersonalBrainToolRegistry';
import { DefaultKnowledgeTransferGate } from './knowledge-transfer/DefaultKnowledgeTransferGate';
import { DefaultContributionGate } from './knowledge-transfer/contribution/DefaultContributionGate';
import { KnowledgeContributionService } from './knowledge-transfer/contribution/KnowledgeContributionService';
import { ContributionHistoryService } from './knowledge-transfer/contribution/ContributionHistoryService';
import { SecAggRoundService } from './global-knowledge/secure-aggregation/SecAggRoundService';
import type { SupplierMonitorPort } from '../../modules/admin-command-bar/application/ports/SupplierMonitorPort';
import { AgentPatternDistillationService } from './global-knowledge/agent-patterns/AgentPatternDistillationService';
import { AgentPatternContributionGate } from './global-knowledge/agent-patterns/AgentPatternContributionGate';
import { AgentPatternSyncService } from './global-knowledge/agent-patterns/AgentPatternSyncService';
import { logger } from '../../shared/logging/logger';

export interface IntelligenceLayer {
  agentRuntime: AgentRuntimePort;
  personalBrainRegistry: PersonalBrainRegistry;
  globalBrain: GlobalBrainPort;
  knowledgeTransfer: KnowledgeTransferPort;
  globalKnowledgeService: GlobalKnowledgeService;
  globalKnowledgeAdminService: GlobalKnowledgeAdminService;
  knowledgeDistillationService: KnowledgeDistillationService;
  crossTenantSubmitPipeline: CrossTenantSubmitPipeline;
  knowledgeContributionService: KnowledgeContributionService;
  contributionHistoryService: ContributionHistoryService;
  secAggRoundService: SecAggRoundService;
  loraRegistry: LoRAAdapterRegistryPort;
  brainMemoryService: BrainMemoryService;
  vectorStore: VectorStorePort;
  embedding: EmbeddingPort;
  commandBrainService?: CommandBrainService;
  brainResponseService: BrainResponseService;
  merchantKnowledgeIndexer?: MerchantKnowledgeIndexer;
  contextRetriever?: ContextRetriever;
  toolRegistry?: PersonalBrainToolRegistry;
  adaptiveLearning?: BrainAdaptiveLearningService;
  agentLoop?: BrainAgentLoop;
  planMemoryService?: PlanMemoryService;
  personalBrainMemory: PersonalBrainMemoryService;
  memoryConsolidationJob: ReturnType<typeof createMemoryConsolidationJob>;
  agentSupervisor?: AgentSupervisorPort;
  agentRegistry?: AgentRegistry;
  agentOrchestrator?: AgentOrchestrator;
  reflectionDistillationService?: ReflectionDistillationService;
  reflectionExperimentService?: ReflectionExperimentService;
  reflectionMetricsRecorder?: ReflectionMetricsRecorder;
  agentPatternSync?: AgentPatternSyncService;
}

export interface IntelligenceLayerDeps {
  submitInsight?: SubmitInsightUseCase;
  queryInsights?: QueryInsightsUseCase;
  privacyBudgetService?: PrivacyBudgetService;
  adminData?: AdminDataPort;
  supplierMonitor?: SupplierMonitorPort;
  dynamicPricingEngine?: DynamicPricingEngine;
}

function resolveEmbedding(): EmbeddingPort {
  return createProductionEmbedding();
}

function resolveLoRARegistry(): LoRAAdapterRegistryPort {
  if (process.env.INTELLIGENCE_VECTOR_BACKEND === 'memory') {
    return new InMemoryLoRAAdapter();
  }
  return new FilesystemLoRAAdapter();
}

function resolveAgentState(): AgentStatePort {
  if (process.env.INTELLIGENCE_VECTOR_BACKEND === 'memory') {
    return new InMemoryAgentStateAdapter();
  }
  return new PrismaAgentStateAdapter();
}

function resolveKnowledgeTransfer(deps?: IntelligenceLayerDeps): KnowledgeTransferPort {
  if (deps?.submitInsight && deps?.queryInsights) {
    return new HiveMindKnowledgeTransferAdapter(deps.submitInsight, deps.queryInsights);
  }
  return new KnowledgeTransferService();
}

function resolveGlobalBrain(deps?: IntelligenceLayerDeps): GlobalBrainPort {
  if (deps?.queryInsights) {
    return new HiveMindGlobalBrain(deps.queryInsights);
  }
  return new PlaceholderGlobalBrain();
}

function resolveGlobalKnowledgePort(deps?: IntelligenceLayerDeps) {
  const sources: GlobalKnowledgePort[] = [
    new PrismaGlobalKnowledgeCatalog(),
    new StaticGlobalKnowledgeCatalog(),
  ];

  if (deps?.privacyBudgetService) {
    sources.push(new FederatedGlobalKnowledgeAdapter(new FederatedQueryUseCase(deps.privacyBudgetService)));
  }

  if (deps?.queryInsights) {
    sources.push(new HiveMindGlobalKnowledgeAdapter(deps.queryInsights));
  }

  sources.push(new LoRAPatchAdapter(), new VectorDistillationAdapter());

  return new CompositeGlobalKnowledgePort(sources);
}

function logEmbeddingBackend(embedding: EmbeddingPort): void {
  const backend =
    process.env.INTELLIGENCE_EMBEDDING === 'ollama' ? 'ollama (resilient)' : 'hash (default)';
  logger.info('intelligence_embedding_backend', { backend, model: embedding.constructor.name });
}

export function createIntelligenceLayer(
  deps?: IntelligenceLayerDeps,
  overrides?: Partial<{
    vectorStore: VectorStorePort;
    embedding: EmbeddingPort;
    agentState: AgentStatePort;
    parser: CommandParserService;
    loraRegistry: LoRAAdapterRegistryPort;
  }>
): IntelligenceLayer {
  const embedding = overrides?.embedding ?? resolveEmbedding();
  logEmbeddingBackend(embedding);

  const vectorStore = overrides?.vectorStore ?? resolveVectorStore();
  const agentState = overrides?.agentState ?? resolveAgentState();
  const loraRegistry = overrides?.loraRegistry ?? resolveLoRARegistry();
  const personalBrainRegistry = new PersonalBrainRegistry(
    vectorStore,
    embedding,
    loraRegistry,
    agentState
  );
  const parser = overrides?.parser ?? new CommandParserService();
  const knowledgeTransfer = resolveKnowledgeTransfer(deps);
  const globalBrain = resolveGlobalBrain(deps);
  const ktGate = new DefaultKnowledgeTransferGate();
  const globalKnowledgePort = resolveGlobalKnowledgePort(deps);
  const globalKnowledgeService = new GlobalKnowledgeService(
    globalKnowledgePort,
    personalBrainRegistry,
    ktGate,
    undefined,
    undefined,
    loraRegistry
  );
  const globalKnowledgeAdminService = new GlobalKnowledgeAdminService();
  const knowledgeDistillationService = new KnowledgeDistillationService(personalBrainRegistry);
  const crossTenantSubmitPipeline = new CrossTenantSubmitPipeline();
  const contributionGate = new DefaultContributionGate();
  const secAggRoundService = new SecAggRoundService();
  const knowledgeContributionService = new KnowledgeContributionService(
    knowledgeTransfer,
    contributionGate,
    crossTenantSubmitPipeline,
    secAggRoundService
  );
  const contributionHistoryService = new ContributionHistoryService();

  const agentRuntime = new AgentRuntime(
    personalBrainRegistry,
    parser,
    globalBrain,
    knowledgeTransfer,
    ktGate,
    globalKnowledgeService
  );
  const brainMemoryService = new BrainMemoryService(personalBrainRegistry, vectorStore, embedding);
  let personalBrainMemory = new PersonalBrainMemoryService(personalBrainRegistry);
  const memoryConsolidationJob = createMemoryConsolidationJob(() => personalBrainMemory);
  const brainResponseService = new BrainResponseService();

  let commandBrainService: CommandBrainService | undefined;
  let merchantKnowledgeIndexer: MerchantKnowledgeIndexer | undefined;
  let contextRetriever: ContextRetriever | undefined;
  let toolRegistry: PersonalBrainToolRegistry | undefined;
  let adaptiveLearning: BrainAdaptiveLearningService | undefined;
  let agentLoop: BrainAgentLoop | undefined;
  let planMemoryService: PlanMemoryService | undefined;
  let agentSupervisor: AgentOrchestrator | undefined;
  let agentRegistry: AgentRegistry | undefined;
  let reflectionDistillationService: ReflectionDistillationService | undefined;
  const reflectionExperimentService = new ReflectionExperimentService();
  const reflectionMetricsRecorder = new ReflectionMetricsRecorder(reflectionExperimentService);
  const reflectionHandoffStore = new ReflectionHandoffStore();
  const agentPatternSync = new AgentPatternSyncService(
    new AgentPatternDistillationService(),
    new AgentPatternContributionGate()
  );

  if (deps?.adminData) {
    merchantKnowledgeIndexer = new MerchantKnowledgeIndexer(personalBrainRegistry, deps.adminData);
    contextRetriever = new ContextRetriever(
      personalBrainRegistry,
      deps.adminData,
      globalKnowledgeService
    );
    commandBrainService = new CommandBrainService(
      merchantKnowledgeIndexer,
      contextRetriever,
      deps.adminData
    );

    adaptiveLearning = new BrainAdaptiveLearningService(
      personalBrainRegistry,
      new ReflectionAdaptiveHintService(personalBrainMemory.longTerm)
    );
    planMemoryService = new PlanMemoryService(personalBrainRegistry);
    personalBrainMemory = new PersonalBrainMemoryService(
      personalBrainRegistry,
      planMemoryService,
      adaptiveLearning,
      undefined,
      new ReflectionHandoffService(personalBrainMemory.longTerm, reflectionHandoffStore)
    );
    reflectionDistillationService = new ReflectionDistillationService(personalBrainMemory.longTerm);
    agentRegistry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);
    toolRegistry = new PersonalBrainToolRegistry(
      {
        adminData: deps.adminData,
        personalBrains: personalBrainRegistry,
        globalBrain,
        supplierMonitor: deps.supplierMonitor,
        submitInsight: deps.submitInsight,
        ktGate,
      },
      adaptiveLearning
    );
    toolRegistry.register(analyzeMarginsTool({ adminData: deps.adminData, personalBrains: personalBrainRegistry }));
    toolRegistry.register(
      suggestOptimalPriceTool({
        adminData: deps.adminData,
        personalBrains: personalBrainRegistry,
        dynamicPricingEngine: deps.dynamicPricingEngine,
      })
    );
    toolRegistry.register(createSupplierTool({ adminData: deps.adminData }));
    toolRegistry.register(getInventoryStatusTool({ adminData: deps.adminData }));
    toolRegistry.register(listLowStockTool({ adminData: deps.adminData }));
    toolRegistry.register(suggestRestockTool({ adminData: deps.adminData }));
    toolRegistry.register(getEmailSummaryTool({ adminData: deps.adminData }));
    agentLoop = new BrainAgentLoop(toolRegistry);
    agentLoop.setPlanMemory(planMemoryService);
    brainResponseService.setAgentLoop(agentLoop);
    const specialistRunner = new SpecialistAgentRunner(
      agentRegistry,
      personalBrainRegistry,
      agentLoop,
      contextRetriever,
      merchantKnowledgeIndexer,
      personalBrainMemory
    );
    const agentRouter = new AgentRouterService(agentRegistry);
    const parallelCoordinator = new ParallelCoordinator(agentRegistry, specialistRunner);
    let orchestratorRef: AgentOrchestrator;
    const nativeGraph = new NativeGraphOrchestrator(
      agentRegistry,
      specialistRunner,
      parallelCoordinator,
      (requests) => orchestratorRef.executeSequential(requests)
    );
    const graphOrchestrator = new LangGraphOrchestrator(nativeGraph);
    orchestratorRef = new AgentOrchestrator(
      agentRegistry,
      specialistRunner,
      personalBrainMemory,
      agentRouter,
      parallelCoordinator,
      graphOrchestrator
    );
    agentSupervisor = orchestratorRef;
  }

  return {
    agentRuntime,
    personalBrainRegistry,
    globalBrain,
    knowledgeTransfer,
    globalKnowledgeService,
    globalKnowledgeAdminService,
    knowledgeDistillationService,
    crossTenantSubmitPipeline,
    knowledgeContributionService,
    contributionHistoryService,
    secAggRoundService,
    loraRegistry,
    brainMemoryService,
    vectorStore,
    embedding,
    commandBrainService,
    brainResponseService,
    merchantKnowledgeIndexer,
    contextRetriever,
    toolRegistry,
    adaptiveLearning,
    agentLoop,
    planMemoryService,
    personalBrainMemory,
    memoryConsolidationJob,
    agentSupervisor,
    agentRegistry,
    agentOrchestrator: agentSupervisor,
    reflectionDistillationService,
    reflectionExperimentService,
    reflectionMetricsRecorder,
    agentPatternSync,
  };
}

/** In-memory stack for unit tests */
export function createInMemoryIntelligenceLayer(): IntelligenceLayer {
  return createIntelligenceLayer(undefined, {
    embedding: new SimpleHashEmbeddingAdapter(),
    vectorStore: new InMemoryVectorStoreAdapter(),
    agentState: new InMemoryAgentStateAdapter(),
    loraRegistry: new InMemoryLoRAAdapter(),
  });
}
