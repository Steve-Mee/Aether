import { BrainResponseService } from './command-brain/BrainResponseService';
import { CommandBrainService } from './command-brain/CommandBrainService';
import { MerchantKnowledgeIndexer } from './merchant-knowledge/MerchantKnowledgeIndexer';
import { ContextRetriever } from './retrieval/ContextRetriever';
import { BrainAdaptiveLearningService } from './command-brain/BrainAdaptiveLearningService';
import { PlanMemoryService } from './command-brain/PlanMemoryService';
import { PersonalBrainMemoryService } from './personal-brain/memory/PersonalBrainMemoryService';
import { ReflectionAdaptiveHintService } from './personal-brain/reflection/adaptive/ReflectionAdaptiveHintService';
import { ReflectionHandoffService } from './personal-brain/reflection/ReflectionHandoffService';
import { ReflectionHandoffStore } from './personal-brain/reflection/ReflectionHandoffStore';
import { ReflectionDistillationService } from './global-knowledge/distillation/ReflectionDistillationService';
import { AgentRegistry } from './multi-agent/AgentRegistry';
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
import { DEFAULT_SPECIALIST_AGENTS, globalAdvisoryAgentDefinition } from './multi-agent/agents';
import { PersonalBrainToolRegistry } from './personal-brain/tools/PersonalBrainToolRegistry';
import type { PersonalBrainRegistry } from './personal-brain/PersonalBrainRegistry';
import type { GlobalBrainPort } from './global-brain/GlobalBrainPort';
import type { GlobalKnowledgeService } from './global-knowledge/GlobalKnowledgeService';
import type { DefaultKnowledgeTransferGate } from './knowledge-transfer/DefaultKnowledgeTransferGate';
import type { ReflectionExperimentService } from './personal-brain/reflection/experiments/ReflectionExperimentService';
import type { ReflectionMetricsRecorder } from './personal-brain/reflection/ReflectionMetricsRecorder';
import type { AgentPatternSyncService } from './global-knowledge/agent-patterns/AgentPatternSyncService';
import type { IntelligenceLayerDeps } from './resolveIntelligenceDeps';
import { registerCommerceTools } from './multi-agent/wiring/registerCommerceTools';
import { registerStorefrontTools } from './multi-agent/wiring/registerStorefrontTools';
import { wireOrchestrationStack } from './multi-agent/wiring/wireOrchestrationStack';
import type { AgentOrchestrator } from './multi-agent/AgentSupervisorOrchestrator';
import type { MultiAgentResultAggregator } from './multi-agent/MultiAgentResultAggregator';
import type { PeerDelegationBridge } from './multi-agent/peer/PeerDelegationBridge';
import type { FederatedExecutionWorker } from './multi-agent/peer/federated/FederatedExecutionWorker';
import type { BrainAgentLoop } from './command-brain/BrainAgentLoop';

export interface MultiAgentWiring {
  commandBrainService: CommandBrainService;
  merchantKnowledgeIndexer: MerchantKnowledgeIndexer;
  contextRetriever: ContextRetriever;
  toolRegistry: PersonalBrainToolRegistry;
  adaptiveLearning: BrainAdaptiveLearningService;
  agentLoop: BrainAgentLoop;
  planMemoryService: PlanMemoryService;
  personalBrainMemory: PersonalBrainMemoryService;
  agentSupervisor: AgentOrchestrator;
  multiAgentResultAggregator: MultiAgentResultAggregator;
  agentRegistry: AgentRegistry;
  reflectionDistillationService: ReflectionDistillationService;
  peerDelegationBridge: PeerDelegationBridge;
  federatedExecutionWorker: FederatedExecutionWorker;
  runWorkingMemory: import('./multi-agent/memory/RunWorkingMemoryPort').RunWorkingMemoryPort;
  sharedMemoryBridge: SharedMemoryBridge;
  runMemoryPromoter: RunMemoryPromoter;
  runMemoryGcJob: RunMemoryGcJob;
}

export interface WireMultiAgentInput {
  deps: IntelligenceLayerDeps;
  personalBrainRegistry: PersonalBrainRegistry;
  globalBrain: GlobalBrainPort;
  globalKnowledgeService: GlobalKnowledgeService;
  ktGate: DefaultKnowledgeTransferGate;
  brainResponseService: BrainResponseService;
  reflectionExperimentService: ReflectionExperimentService;
  reflectionMetricsRecorder: ReflectionMetricsRecorder;
  agentPatternSync: AgentPatternSyncService;
  initialPersonalBrainMemory: PersonalBrainMemoryService;
  reflectionHandoffStore: ReflectionHandoffStore;
}

export function wireMultiAgent(input: WireMultiAgentInput): MultiAgentWiring {
  const {
    deps,
    personalBrainRegistry,
    globalBrain,
    globalKnowledgeService,
    ktGate,
    brainResponseService,
    reflectionMetricsRecorder,
    agentPatternSync,
    initialPersonalBrainMemory,
    reflectionHandoffStore,
  } = input;

  const merchantKnowledgeIndexer = new MerchantKnowledgeIndexer(personalBrainRegistry, deps.adminData!);
  const contextRetriever = new ContextRetriever(
    personalBrainRegistry,
    deps.adminData!,
    globalKnowledgeService
  );
  const commandBrainService = new CommandBrainService(
    merchantKnowledgeIndexer,
    contextRetriever,
    deps.adminData!
  );

  const adaptiveLearning = new BrainAdaptiveLearningService(
    personalBrainRegistry,
    new ReflectionAdaptiveHintService(initialPersonalBrainMemory.longTerm)
  );
  const planMemoryService = new PlanMemoryService(personalBrainRegistry);
  const personalBrainMemory = new PersonalBrainMemoryService(
    personalBrainRegistry,
    planMemoryService,
    adaptiveLearning,
    undefined,
    new ReflectionHandoffService(initialPersonalBrainMemory.longTerm, reflectionHandoffStore)
  );
  const reflectionDistillationService = new ReflectionDistillationService(personalBrainMemory.longTerm);
  const agentRegistry = new AgentRegistry([...DEFAULT_SPECIALIST_AGENTS, globalAdvisoryAgentDefinition]);
  const toolRegistry = new PersonalBrainToolRegistry(
    {
      adminData: deps.adminData!,
      personalBrains: personalBrainRegistry,
      globalBrain,
      supplierMonitor: deps.supplierMonitor,
      submitInsight: deps.submitInsight,
      ktGate,
    },
    adaptiveLearning
  );

  const compositeMemory = new CompositeSharedMemoryAdapter();
  const redisLayer = isRunMemoryRedisCacheEnabled()
    ? new RedisRunMemoryCacheAdapter(compositeMemory)
    : compositeMemory;
  const runWorkingMemory = new CachingRunWorkingMemoryAdapter(redisLayer);
  const sharedMemoryBridge = new SharedMemoryBridge(runWorkingMemory);
  const runMemoryPromoter = new RunMemoryPromoter(runWorkingMemory);
  const runMemoryGcJob = createRunMemoryGcJob(runWorkingMemory);

  registerCommerceTools({
    toolRegistry,
    deps,
    personalBrainRegistry,
    segment: 'core',
    afterPromotion: () => {
      toolRegistry.register(readRunMemoryTool({ runMemory: runWorkingMemory }));
      toolRegistry.register(writeRunMemoryTool({ runMemory: runWorkingMemory }));
      toolRegistry.register(listRunMemoryTool({ runMemory: runWorkingMemory }));
      toolRegistry.register(appendRunMemoryTool({ runMemory: runWorkingMemory }));
    },
  });
  registerCommerceTools({ toolRegistry, deps, personalBrainRegistry, segment: 'catalog' });
  registerStorefrontTools({ toolRegistry, personalBrainRegistry });
  registerCommerceTools({ toolRegistry, deps, personalBrainRegistry, segment: 'autonomy' });

  const orchestration = wireOrchestrationStack({
    toolRegistry,
    planMemoryService,
    brainResponseService,
    agentRegistry,
    personalBrainRegistry,
    contextRetriever,
    merchantKnowledgeIndexer,
    personalBrainMemory,
    runWorkingMemory,
    sharedMemoryBridge,
    reflectionMetricsRecorder,
    agentPatternSync,
  });

  return {
    commandBrainService,
    merchantKnowledgeIndexer,
    contextRetriever,
    toolRegistry,
    adaptiveLearning,
    agentLoop: orchestration.agentLoop,
    planMemoryService,
    personalBrainMemory,
    agentSupervisor: orchestration.agentSupervisor,
    multiAgentResultAggregator: orchestration.multiAgentResultAggregator,
    agentRegistry,
    reflectionDistillationService,
    peerDelegationBridge: orchestration.peerDelegationBridge,
    federatedExecutionWorker: orchestration.federatedExecutionWorker,
    runWorkingMemory,
    sharedMemoryBridge,
    runMemoryPromoter,
    runMemoryGcJob,
  };
}
