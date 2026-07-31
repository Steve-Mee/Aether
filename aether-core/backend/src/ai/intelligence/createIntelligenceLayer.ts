import { CommandParserService } from '../../modules/admin-command-bar/application/services/CommandParserService';
import { BrainMemoryService } from './brain-memory/BrainMemoryService';
import { AgentRuntime } from './agent-runtime/AgentRuntime';
import type { AgentRuntimePort } from './agent-runtime/AgentRuntimePort';
import type { GlobalBrainPort } from './global-brain/GlobalBrainPort';
import type { LoRAAdapterRegistryPort } from './personal-brain/LoRAAdapterRegistryPort';
import type { AgentStatePort } from './personal-brain/AgentStatePort';
import { PersonalBrainRegistry } from './personal-brain/PersonalBrainRegistry';
import type { EmbeddingPort } from './vector-store/EmbeddingPort';
import { SimpleHashEmbeddingAdapter } from './vector-store/SimpleHashEmbeddingAdapter';
import { InMemoryVectorStoreAdapter } from './vector-store/adapters/InMemoryVectorStoreAdapter';
import { resolveVectorStore } from './vector-store/TenantRoutingVectorStoreAdapter';
import type { VectorStorePort } from './vector-store/VectorStorePort';
import { BrainResponseService } from './command-brain/BrainResponseService';
import type { CommandBrainService } from './command-brain/CommandBrainService';
import { PersonalBrainMemoryService } from './personal-brain/memory/PersonalBrainMemoryService';
import { ReflectionHandoffStore } from './personal-brain/reflection/ReflectionHandoffStore';
import { ReflectionExperimentService } from './personal-brain/reflection/experiments/ReflectionExperimentService';
import { ReflectionMetricsRecorder } from './personal-brain/reflection/ReflectionMetricsRecorder';
import type { AgentSupervisorPort } from './multi-agent/AgentSupervisorPort';
import { AgentOrchestrator } from './multi-agent/AgentSupervisorOrchestrator';
import { AgentRegistry } from './multi-agent/AgentRegistry';
import { MultiAgentResultAggregator } from './multi-agent/MultiAgentResultAggregator';
import type { RunWorkingMemoryPort } from './multi-agent/memory/RunWorkingMemoryPort';
import { SharedMemoryBridge } from './multi-agent/memory/SharedMemoryBridge';
import { RunMemoryPromoter } from './multi-agent/memory/RunMemoryPromoter';
import type { RunMemoryGcJob } from './multi-agent/memory/jobs/RunMemoryGcJob';
import type { PeerDelegationBridge } from './multi-agent/peer/PeerDelegationBridge';
import type { FederatedExecutionWorker } from './multi-agent/peer/federated/FederatedExecutionWorker';
import { DefaultKnowledgeTransferGate } from './knowledge-transfer/DefaultKnowledgeTransferGate';
import { DefaultContributionGate } from './knowledge-transfer/contribution/DefaultContributionGate';
import { KnowledgeContributionService } from './knowledge-transfer/contribution/KnowledgeContributionService';
import { ContributionHistoryService } from './knowledge-transfer/contribution/ContributionHistoryService';
import { SecAggRoundService } from './global-knowledge/secure-aggregation/SecAggRoundService';
import { GlobalKnowledgeAdminService } from './global-knowledge/GlobalKnowledgeAdminService';
import { GlobalKnowledgeService } from './global-knowledge/GlobalKnowledgeService';
import { KnowledgeDistillationService } from './global-knowledge/distillation/KnowledgeDistillationService';
import { CrossTenantSubmitPipeline } from './global-knowledge/federated/FederatedQueryUseCase';
import type { KnowledgeTransferPort } from './knowledge-transfer/KnowledgeTransferPort';
import { createMemoryConsolidationJob } from './personal-brain/memory/jobs/MemoryConsolidationJob';
import type { PersonalBrainToolRegistry } from './personal-brain/tools/PersonalBrainToolRegistry';
import type { BrainAdaptiveLearningService } from './command-brain/BrainAdaptiveLearningService';
import type { BrainAgentLoop } from './command-brain/BrainAgentLoop';
import type { PlanMemoryService } from './command-brain/PlanMemoryService';
import type { MerchantKnowledgeIndexer } from './merchant-knowledge/MerchantKnowledgeIndexer';
import type { ContextRetriever } from './retrieval/ContextRetriever';
import type { ReflectionDistillationService } from './global-knowledge/distillation/ReflectionDistillationService';
import { AgentPatternDistillationService } from './global-knowledge/agent-patterns/AgentPatternDistillationService';
import { AgentPatternContributionGate } from './global-knowledge/agent-patterns/AgentPatternContributionGate';
import { AgentPatternSyncService } from './global-knowledge/agent-patterns/AgentPatternSyncService';
import { InMemoryLoRAAdapter } from './personal-brain/InMemoryLoRAAdapter';
import { InMemoryAgentStateAdapter } from './personal-brain/PrismaAgentStateAdapter';
import {
  type IntelligenceLayerDeps,
  resolveEmbedding,
  resolveLoRARegistry,
  resolveAgentState,
  resolveKnowledgeTransfer,
  resolveGlobalBrain,
  resolveGlobalKnowledgePort,
  logEmbeddingBackend,
} from './resolveIntelligenceDeps';
import { wireMultiAgent } from './wireMultiAgent';

export type { IntelligenceLayerDeps } from './resolveIntelligenceDeps';

export interface IntelligenceLayer {
  agentRuntime: AgentRuntimePort;
  personalBrainRegistry: PersonalBrainRegistry;
  globalBrain: GlobalBrainPort;
  /** Honest GlobalBrain mode for health / observability (`placeholder` | `hive-mind`). */
  globalBrainMode: 'placeholder' | 'hive-mind';
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
    const multiAgent = wireMultiAgent({
      deps,
      personalBrainRegistry,
      globalBrain,
      globalKnowledgeService,
      ktGate,
      brainResponseService,
      reflectionExperimentService,
      reflectionMetricsRecorder,
      agentPatternSync,
      initialPersonalBrainMemory: personalBrainMemory,
      reflectionHandoffStore,
    });
    commandBrainService = multiAgent.commandBrainService;
    merchantKnowledgeIndexer = multiAgent.merchantKnowledgeIndexer;
    contextRetriever = multiAgent.contextRetriever;
    toolRegistry = multiAgent.toolRegistry;
    adaptiveLearning = multiAgent.adaptiveLearning;
    agentLoop = multiAgent.agentLoop;
    planMemoryService = multiAgent.planMemoryService;
    personalBrainMemory = multiAgent.personalBrainMemory;
    agentSupervisor = multiAgent.agentSupervisor;
    multiAgentResultAggregator = multiAgent.multiAgentResultAggregator;
    agentRegistry = multiAgent.agentRegistry;
    reflectionDistillationService = multiAgent.reflectionDistillationService;
    peerDelegationBridge = multiAgent.peerDelegationBridge;
    federatedExecutionWorker = multiAgent.federatedExecutionWorker;
    runWorkingMemory = multiAgent.runWorkingMemory;
    sharedMemoryBridge = multiAgent.sharedMemoryBridge;
    runMemoryPromoter = multiAgent.runMemoryPromoter;
    runMemoryGcJob = multiAgent.runMemoryGcJob;
  }

  return {
    agentRuntime,
    personalBrainRegistry,
    globalBrain,
    globalBrainMode: globalBrain.mode === 'hive-mind' ? 'hive-mind' : 'placeholder',
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
