import type { ReflectionMetricsRecorder } from '../../personal-brain/reflection/ReflectionMetricsRecorder';
import type { SharedMemoryBridge } from '../memory/SharedMemoryBridge';
import type { AgentRegistry } from '../AgentRegistry';
import type { AgentRouterService } from '../AgentRouterService';
import { DelegationProtocol } from '../DelegationProtocol';
import type { ParallelCoordinator } from '../ParallelCoordinator';
import type { GraphOrchestratorPort } from '../graph/GraphOrchestratorPort';
import type { SpecialistAgentRunner } from '../SpecialistAgentRunner';

export interface OrchestratorDeps {
  agentRegistry: AgentRegistry;
  specialistRunner?: SpecialistAgentRunner;
  agentRouter?: AgentRouterService;
  parallelCoordinator?: ParallelCoordinator;
  graphOrchestrator?: GraphOrchestratorPort;
  reflectionMetrics?: ReflectionMetricsRecorder;
  sharedMemoryBridge?: SharedMemoryBridge;
  protocol: DelegationProtocol;
}
