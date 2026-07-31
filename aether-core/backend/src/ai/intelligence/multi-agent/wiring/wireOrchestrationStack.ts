import { BrainAgentLoop } from '../../command-brain/BrainAgentLoop';
import { BrainResponseService } from '../../command-brain/BrainResponseService';
import { PlanMemoryService } from '../../command-brain/PlanMemoryService';
import { ContextRetriever } from '../../retrieval/ContextRetriever';
import { MerchantKnowledgeIndexer } from '../../merchant-knowledge/MerchantKnowledgeIndexer';
import { PersonalBrainMemoryService } from '../../personal-brain/memory/PersonalBrainMemoryService';
import { PersonalBrainToolRegistry } from '../../personal-brain/tools/PersonalBrainToolRegistry';
import type { PersonalBrainRegistry } from '../../personal-brain/PersonalBrainRegistry';
import type { ReflectionMetricsRecorder } from '../../personal-brain/reflection/ReflectionMetricsRecorder';
import type { AgentPatternSyncService } from '../../global-knowledge/agent-patterns/AgentPatternSyncService';
import { AgentOrchestrator } from '../AgentSupervisorOrchestrator';
import { AgentRegistry } from '../AgentRegistry';
import { AgentRouterService } from '../AgentRouterService';
import { PrismaAgentPerformanceAdapter } from '../routing/PrismaAgentPerformanceAdapter';
import { AgentPeerBus } from '../peer/AgentPeerBus';
import { AgentPeerMesh } from '../peer/AgentPeerMesh';
import { delegateToAgentTool } from '../peer/delegateToAgentTool';
import { delegateToAgentAsyncTool } from '../peer/delegateToAgentAsyncTool';
import { sendAgentMessageTool } from '../peer/sendAgentMessageTool';
import { SharedMemoryBridge } from '../memory/SharedMemoryBridge';
import type { RunWorkingMemoryPort } from '../memory/RunWorkingMemoryPort';
import { FederatedPeerPort } from '../peer/FederatedPeerPort';
import { FederatedExecutionPort } from '../peer/federated/FederatedExecutionPort';
import { FederatedExecutionWorker } from '../peer/federated/FederatedExecutionWorker';
import { createMessageBroker } from '../../../../shared/messaging/createMessageBroker';
import { FederatedExecutionGate } from '../peer/federated/FederatedExecutionGate';
import { PeerDelegationBridge } from '../peer/PeerDelegationBridge';
import { PrismaAgentPeerJobAdapter } from '../peer/jobs/PrismaAgentPeerJobAdapter';
import {
  AgentPeerJobWorker,
  registerAgentPeerJobEventHandler,
  setAgentPeerJobWorker,
} from '../peer/jobs/AgentPeerJobWorker';
import { CollaborationGraphBuilder } from '../graph/CollaborationGraphBuilder';
import { CollaborationPlannerService } from '../CollaborationPlannerService';
import { ParallelCoordinator } from '../ParallelCoordinator';
import { MultiAgentResultAggregator } from '../MultiAgentResultAggregator';
import { SpecialistAgentRunner } from '../SpecialistAgentRunner';
import { NativeGraphOrchestrator } from '../graph/NativeGraphOrchestrator';
import { LangGraphOrchestrator } from '../graph/LangGraphOrchestrator';

export interface WireOrchestrationStackInput {
  toolRegistry: PersonalBrainToolRegistry;
  planMemoryService: PlanMemoryService;
  brainResponseService: BrainResponseService;
  agentRegistry: AgentRegistry;
  personalBrainRegistry: PersonalBrainRegistry;
  contextRetriever: ContextRetriever;
  merchantKnowledgeIndexer: MerchantKnowledgeIndexer;
  personalBrainMemory: PersonalBrainMemoryService;
  runWorkingMemory: RunWorkingMemoryPort;
  sharedMemoryBridge: SharedMemoryBridge;
  reflectionMetricsRecorder: ReflectionMetricsRecorder;
  agentPatternSync: AgentPatternSyncService;
}

export interface OrchestrationStackWiring {
  agentLoop: BrainAgentLoop;
  agentSupervisor: AgentOrchestrator;
  multiAgentResultAggregator: MultiAgentResultAggregator;
  peerDelegationBridge: PeerDelegationBridge;
  federatedExecutionWorker: FederatedExecutionWorker;
}

export function wireOrchestrationStack(input: WireOrchestrationStackInput): OrchestrationStackWiring {
  const {
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
  } = input;

  const agentLoop = new BrainAgentLoop(toolRegistry);
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
  const federatedExecutionWorker = new FederatedExecutionWorker(
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

  const agentSupervisor = orchestratorRef;
  const peerJobPort = new PrismaAgentPeerJobAdapter();
  const peerJobWorker = new AgentPeerJobWorker({
    jobPort: peerJobPort,
    peerBus: agentPeerBus,
    orchestrator: orchestratorRef,
  });
  setAgentPeerJobWorker(peerJobWorker);
  registerAgentPeerJobEventHandler();

  const peerDelegationBridge = new PeerDelegationBridge(
    orchestratorRef,
    agentPeerBus,
    peerJobPort,
    agentRegistry
  );

  toolRegistry.register(delegateToAgentTool({ peerBus: agentPeerBus }));
  toolRegistry.register(sendAgentMessageTool({ peerBus: agentPeerBus }));
  toolRegistry.register(delegateToAgentAsyncTool({ peerBus: agentPeerBus, jobPort: peerJobPort }));

  return {
    agentLoop,
    agentSupervisor,
    multiAgentResultAggregator,
    peerDelegationBridge,
    federatedExecutionWorker,
  };
}
