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
import { PrismaAgentPerformanceAdapter } from './multi-agent/routing/PrismaAgentPerformanceAdapter';
import { AgentPeerBus } from './multi-agent/peer/AgentPeerBus';
import { AgentPeerMesh } from './multi-agent/peer/AgentPeerMesh';
import { delegateToAgentTool } from './multi-agent/peer/delegateToAgentTool';
import { delegateToAgentAsyncTool } from './multi-agent/peer/delegateToAgentAsyncTool';
import { sendAgentMessageTool } from './multi-agent/peer/sendAgentMessageTool';
import type { RunWorkingMemoryPort } from './multi-agent/memory/RunWorkingMemoryPort';
import { CompositeSharedMemoryAdapter } from './multi-agent/memory/CompositeSharedMemoryAdapter';
import { CachingRunWorkingMemoryAdapter } from './multi-agent/memory/CachingRunWorkingMemoryAdapter';
import { RedisRunMemoryCacheAdapter } from './multi-agent/memory/RedisRunMemoryCacheAdapter';
import { isRunMemoryRedisCacheEnabled } from './multi-agent/memory/runMemoryConfig';
import { SharedMemoryBridge } from './multi-agent/memory/SharedMemoryBridge';
import { RunMemoryPromoter } from './multi-agent/memory/RunMemoryPromoter';
import { createRunMemoryGcJob, type RunMemoryGcJob } from './multi-agent/memory/jobs/RunMemoryGcJob';
import {
  readRunMemoryTool,
  writeRunMemoryTool,
  listRunMemoryTool,
  appendRunMemoryTool,
} from './multi-agent/memory/runMemoryTools';
import { FederatedPeerPort } from './multi-agent/peer/FederatedPeerPort';
import { FederatedExecutionPort } from './multi-agent/peer/federated/FederatedExecutionPort';
import { FederatedExecutionWorker } from './multi-agent/peer/federated/FederatedExecutionWorker';
import { createMessageBroker } from '../../shared/messaging/createMessageBroker';
import { FederatedExecutionGate } from './multi-agent/peer/federated/FederatedExecutionGate';
import { PeerDelegationBridge } from './multi-agent/peer/PeerDelegationBridge';
import { PrismaAgentPeerJobAdapter } from './multi-agent/peer/jobs/PrismaAgentPeerJobAdapter';
import {
  AgentPeerJobWorker,
  registerAgentPeerJobEventHandler,
  setAgentPeerJobWorker,
} from './multi-agent/peer/jobs/AgentPeerJobWorker';
import { CollaborationGraphBuilder } from './multi-agent/graph/CollaborationGraphBuilder';
import { CollaborationPlannerService } from './multi-agent/CollaborationPlannerService';
import { ParallelCoordinator } from './multi-agent/ParallelCoordinator';
import { MultiAgentResultAggregator } from './multi-agent/MultiAgentResultAggregator';
import { SpecialistAgentRunner } from './multi-agent/SpecialistAgentRunner';
import { NativeGraphOrchestrator } from './multi-agent/graph/NativeGraphOrchestrator';
import { LangGraphOrchestrator } from './multi-agent/graph/LangGraphOrchestrator';
import {
  DEFAULT_SPECIALIST_AGENTS,
  analyzeMarginsTool,
  suggestOptimalPriceTool,
  createSupplierTool,
  getSupplierPriceIntelTool,
  getInventoryStatusTool,
  listLowStockTool,
  suggestRestockTool,
  getCustomerOverviewTool,
  getTopCustomersTool,
  getOrderTrendsTool,
  getRecentOrdersTool,
  getCustomerSegmentsTool,
  getChurnSignalsTool,
  getForecastSummaryTool,
  listForecastsTool,
  forecastProductDemandTool,
  listPendingApprovalsTool,
  summarizeApprovalsByModuleTool,
  approveLowRiskTool,
  getOutcomesSummaryTool,
  getLatestProposedOutcomeTool,
  verifyLatestOutcomeTool,
  listActiveNegotiationsTool,
  getNegotiationDetailTool,
  proposeCounterOfferTool,
  suggestPromotionTool,
  suggestClearancePricingTool,
  createPromotionTool,
  getEmailSummaryTool,
  listProductsTool,
  searchCatalogProductsTool,
  proposeCreateProductTool,
  getAutonomyMetricsTool,
  listDecisionsTool,
  evaluateDecisionTool,
  routeAutonomousDecisionTool,
  globalAdvisoryAgentDefinition,
} from './multi-agent/agents';
import type { DynamicPricingEngine } from '../../modules/inventory-pricing/application/services/DynamicPricingEngine';
import type { DecisionRepository } from '../../modules/autonomous-operations/domain/repositories/DecisionRepository';
import { DemandForecaster } from '../../modules/predictive-commerce/application/services/DemandForecaster';
import { demandForecastAdapter } from '../../modules/predictive-commerce/infrastructure/adapters/PrismaDemandForecastAdapter';
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
  multiAgentResultAggregator?: MultiAgentResultAggregator;
  agentRegistry?: AgentRegistry;
  agentOrchestrator?: AgentOrchestrator;
  reflectionDistillationService?: ReflectionDistillationService;
  reflectionExperimentService?: ReflectionExperimentService;
  reflectionMetricsRecorder?: ReflectionMetricsRecorder;
  agentPatternSync?: AgentPatternSyncService;
  peerDelegationBridge?: PeerDelegationBridge;
  federatedExecutionWorker?: FederatedExecutionWorker;
  runWorkingMemory?: RunWorkingMemoryPort;
  sharedMemoryBridge?: SharedMemoryBridge;
  runMemoryPromoter?: RunMemoryPromoter;
  runMemoryGcJob?: RunMemoryGcJob;
}

export interface IntelligenceLayerDeps {
  submitInsight?: SubmitInsightUseCase;
  queryInsights?: QueryInsightsUseCase;
  privacyBudgetService?: PrivacyBudgetService;
  adminData?: AdminDataPort;
  supplierMonitor?: SupplierMonitorPort;
  dynamicPricingEngine?: DynamicPricingEngine;
  decisionRepository?: DecisionRepository;
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
  let multiAgentResultAggregator: MultiAgentResultAggregator | undefined;
  let peerDelegationBridge: PeerDelegationBridge | undefined;
  let federatedExecutionWorker: FederatedExecutionWorker | undefined;
  let runWorkingMemory: RunWorkingMemoryPort | undefined;
  let sharedMemoryBridge: SharedMemoryBridge | undefined;
  let runMemoryPromoter: RunMemoryPromoter | undefined;
  let runMemoryGcJob: RunMemoryGcJob | undefined;
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
    agentRegistry = new AgentRegistry([...DEFAULT_SPECIALIST_AGENTS, globalAdvisoryAgentDefinition]);
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
    toolRegistry.register(getSupplierPriceIntelTool({ adminData: deps.adminData }));
    toolRegistry.register(getInventoryStatusTool({ adminData: deps.adminData }));
    toolRegistry.register(listLowStockTool({ adminData: deps.adminData }));
    toolRegistry.register(suggestRestockTool({ adminData: deps.adminData }));
    toolRegistry.register(getCustomerOverviewTool({ adminData: deps.adminData }));
    toolRegistry.register(getTopCustomersTool({ adminData: deps.adminData }));
    toolRegistry.register(getOrderTrendsTool({ adminData: deps.adminData }));
    toolRegistry.register(getRecentOrdersTool({ adminData: deps.adminData }));
    toolRegistry.register(getCustomerSegmentsTool({ adminData: deps.adminData }));
    toolRegistry.register(getChurnSignalsTool({ adminData: deps.adminData }));
    const demandForecaster = new DemandForecaster(demandForecastAdapter);
    toolRegistry.register(getForecastSummaryTool({ adminData: deps.adminData, demandForecaster }));
    toolRegistry.register(listForecastsTool({ adminData: deps.adminData, demandForecaster }));
    toolRegistry.register(forecastProductDemandTool({ adminData: deps.adminData, demandForecaster }));
    toolRegistry.register(listPendingApprovalsTool({ adminData: deps.adminData }));
    toolRegistry.register(summarizeApprovalsByModuleTool({ adminData: deps.adminData }));
    toolRegistry.register(approveLowRiskTool({ adminData: deps.adminData }));
    toolRegistry.register(getOutcomesSummaryTool({ adminData: deps.adminData }));
    toolRegistry.register(getLatestProposedOutcomeTool({ adminData: deps.adminData }));
    toolRegistry.register(verifyLatestOutcomeTool({ adminData: deps.adminData }));
    toolRegistry.register(listActiveNegotiationsTool({ adminData: deps.adminData }));
    toolRegistry.register(getNegotiationDetailTool({ adminData: deps.adminData }));
    toolRegistry.register(proposeCounterOfferTool({ adminData: deps.adminData }));
    toolRegistry.register(suggestPromotionTool({ adminData: deps.adminData }));
    toolRegistry.register(suggestClearancePricingTool({ adminData: deps.adminData }));
    toolRegistry.register(createPromotionTool());
    const compositeMemory = new CompositeSharedMemoryAdapter();
    const redisLayer = isRunMemoryRedisCacheEnabled()
      ? new RedisRunMemoryCacheAdapter(compositeMemory)
      : compositeMemory;
    runWorkingMemory = new CachingRunWorkingMemoryAdapter(redisLayer);
    sharedMemoryBridge = new SharedMemoryBridge(runWorkingMemory);
    runMemoryPromoter = new RunMemoryPromoter(runWorkingMemory);
    runMemoryGcJob = createRunMemoryGcJob(runWorkingMemory);
    toolRegistry.register(readRunMemoryTool({ runMemory: runWorkingMemory }));
    toolRegistry.register(writeRunMemoryTool({ runMemory: runWorkingMemory }));
    toolRegistry.register(listRunMemoryTool({ runMemory: runWorkingMemory }));
    toolRegistry.register(appendRunMemoryTool({ runMemory: runWorkingMemory }));
    toolRegistry.register(getEmailSummaryTool({ adminData: deps.adminData }));
    toolRegistry.register(listProductsTool({ adminData: deps.adminData }));
    toolRegistry.register(searchCatalogProductsTool({ adminData: deps.adminData }));
    toolRegistry.register(proposeCreateProductTool({ adminData: deps.adminData }));
    toolRegistry.register(getAutonomyMetricsTool());
    toolRegistry.register(listDecisionsTool({ decisionRepository: deps.decisionRepository }));
    toolRegistry.register(evaluateDecisionTool());
    toolRegistry.register(routeAutonomousDecisionTool());
    agentLoop = new BrainAgentLoop(toolRegistry);
    agentLoop.setPlanMemory(planMemoryService);
    brainResponseService.setAgentLoop(agentLoop);
    const specialistRunner = new SpecialistAgentRunner(
      agentRegistry,
      personalBrainRegistry,
      agentLoop,
      contextRetriever,
      merchantKnowledgeIndexer,
      personalBrainMemory,
      runWorkingMemory
    );
    const collaborationPlanner = new CollaborationPlannerService(agentRegistry);
    const graphBuilder = new CollaborationGraphBuilder();
    const performancePort = new PrismaAgentPerformanceAdapter();
    const agentRouter = new AgentRouterService(
      agentRegistry,
      undefined,
      collaborationPlanner,
      graphBuilder,
      performancePort
    );
    const parallelCoordinator = new ParallelCoordinator(agentRegistry, specialistRunner);
    const multiAgentResultAggregator = new MultiAgentResultAggregator(undefined, runWorkingMemory);
    let orchestratorRef: AgentOrchestrator;
    let agentPeerBus: AgentPeerBus;
    const nativeGraph = new NativeGraphOrchestrator(
      agentRegistry,
      specialistRunner,
      parallelCoordinator,
      (requests) => orchestratorRef.executeSequential(requests),
      undefined
    );
    const graphOrchestrator = new LangGraphOrchestrator(nativeGraph);
    orchestratorRef = new AgentOrchestrator(
      agentRegistry,
      specialistRunner,
      personalBrainMemory,
      agentRouter,
      parallelCoordinator,
      graphOrchestrator,
      reflectionMetricsRecorder,
      runWorkingMemory,
      sharedMemoryBridge
    );
    const federatedPeer = new FederatedPeerPort(agentPatternSync);
    const federatedGate = new FederatedExecutionGate();
    const messageBroker = createMessageBroker();
    const federatedExecution = new FederatedExecutionPort(
      agentPatternSync,
      federatedGate,
      messageBroker
    );
    federatedExecutionWorker = new FederatedExecutionWorker(
      agentPatternSync,
      federatedGate,
      messageBroker
    );
    agentPeerBus = new AgentPeerBus(
      agentRegistry,
      orchestratorRef,
      federatedPeer,
      federatedExecution,
      new AgentPeerMesh(agentRegistry, specialistRunner, agentRegistry),
      sharedMemoryBridge
    );
    nativeGraph.setPeerBus(agentPeerBus);
    agentSupervisor = orchestratorRef;
    const peerJobPort = new PrismaAgentPeerJobAdapter();
    const peerJobWorker = new AgentPeerJobWorker({
      jobPort: peerJobPort,
      peerBus: agentPeerBus,
      orchestrator: orchestratorRef,
    });
    setAgentPeerJobWorker(peerJobWorker);
    registerAgentPeerJobEventHandler();
    const peerDelegationBridgeRef = new PeerDelegationBridge(
      orchestratorRef,
      agentPeerBus,
      peerJobPort,
      agentRegistry
    );
    peerDelegationBridge = peerDelegationBridgeRef;
    toolRegistry.register(delegateToAgentTool({ peerBus: agentPeerBus }));
    toolRegistry.register(sendAgentMessageTool({ peerBus: agentPeerBus }));
    toolRegistry.register(delegateToAgentAsyncTool({ peerBus: agentPeerBus, jobPort: peerJobPort }));
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
    multiAgentResultAggregator,
    agentRegistry,
    agentOrchestrator: agentSupervisor,
    reflectionDistillationService,
    reflectionExperimentService,
    reflectionMetricsRecorder,
    agentPatternSync,
    peerDelegationBridge,
    federatedExecutionWorker,
    runWorkingMemory,
    sharedMemoryBridge,
    runMemoryPromoter,
    runMemoryGcJob,
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
