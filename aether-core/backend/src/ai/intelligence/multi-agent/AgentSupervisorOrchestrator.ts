import type { ReflectionMetricsRecorder } from '../personal-brain/reflection/ReflectionMetricsRecorder';
import type { PersonalBrainMemoryService } from '../personal-brain/memory/PersonalBrainMemoryService';
import type { RunWorkingMemoryPort } from './memory/RunWorkingMemoryPort';
import type { SharedMemoryBridge } from './memory/SharedMemoryBridge';
import { DelegationProtocol } from './DelegationProtocol';
import type { AgentSupervisorPort } from './AgentSupervisorPort';
import type { AgentRegistry } from './AgentRegistry';
import type { AgentRouterService } from './AgentRouterService';
import type { ParallelCoordinator } from './ParallelCoordinator';
import type { GraphOrchestratorPort } from './graph/GraphOrchestratorPort';
import type { GraphExecutionRequest, GraphExecutionResult } from './graph/GraphOrchestratorPort';
import type { SpecialistAgentRunner } from './SpecialistAgentRunner';
import type {
  DelegationRecord,
  DelegationRequest,
  DelegationResult,
  ExecutionPlan,
  HandoffPackage,
  ParallelSpecialistRequest,
  ParallelSpecialistResult,
  ResumeFromChildInput,
  ResumeFromChildResult,
  RouteDecision,
  SpecialistAgentDefinition,
  SpecialistExecuteRequest,
  SpecialistExecuteResult,
} from './types';
import { chainHandoff } from './orchestration/orchestratorChainHandoff';
import type { ChainHandoffInput } from './orchestration/orchestratorChainHandoff';
import {
  buildReturnPackage,
  delegate,
  listDelegations,
  resumeFromChild,
} from './orchestration/orchestratorDelegationLifecycle';
import {
  executeGraph,
  executeParallel,
  executeSequential,
} from './orchestration/orchestratorExecutionModes';
import type { OrchestratorDeps } from './orchestration/orchestratorDeps';
import {
  isDelegationEnabled,
  isGraphOrchestrationEnabledFor,
  needsSupplierIntel,
  resolveExecutionPlan,
  resolveTargetAgent,
  route,
  routeDecision,
  routePlan,
} from './orchestration/orchestratorRouting';
import { executeSpecialist } from './orchestration/orchestratorSpecialistExecution';

export type { ChainHandoffInput };

export class AgentOrchestrator implements AgentSupervisorPort {
  private protocol = new DelegationProtocol();

  constructor(
    private agentRegistry: AgentRegistry,
    private specialistRunner?: SpecialistAgentRunner,
    private personalBrainMemory?: PersonalBrainMemoryService,
    private agentRouter?: AgentRouterService,
    private parallelCoordinator?: ParallelCoordinator,
    private graphOrchestrator?: GraphOrchestratorPort,
    private reflectionMetrics?: ReflectionMetricsRecorder,
    private runMemory?: RunWorkingMemoryPort,
    private sharedMemoryBridge?: SharedMemoryBridge
  ) {}

  private get deps(): OrchestratorDeps {
    return {
      agentRegistry: this.agentRegistry,
      specialistRunner: this.specialistRunner,
      agentRouter: this.agentRouter,
      parallelCoordinator: this.parallelCoordinator,
      graphOrchestrator: this.graphOrchestrator,
      reflectionMetrics: this.reflectionMetrics,
      sharedMemoryBridge: this.sharedMemoryBridge,
      protocol: this.protocol,
    };
  }

  isDelegationEnabled(): boolean {
    return isDelegationEnabled();
  }

  isGraphOrchestrationEnabled(): boolean {
    return isGraphOrchestrationEnabledFor(this.deps);
  }

  async route(
    intent: string,
    command?: string,
    options?: { confidence?: number; onEvent?: SpecialistExecuteRequest['onEvent'] }
  ): Promise<SpecialistAgentDefinition | null> {
    return route(this.deps, intent, command, options);
  }

  async routeDecision(
    intent: string,
    command?: string,
    options?: { confidence?: number; tenantId?: string; onEvent?: SpecialistExecuteRequest['onEvent'] }
  ): Promise<RouteDecision> {
    return routeDecision(this.deps, intent, command, options);
  }

  async routePlan(
    intent: string,
    command?: string,
    options?: { confidence?: number; tenantId?: string }
  ): Promise<ExecutionPlan> {
    return routePlan(this.deps, intent, command, options);
  }

  resolveTargetAgent(intent: string): string | null {
    return resolveTargetAgent(this.deps, intent);
  }

  resolveExecutionPlan(
    command: string,
    intent: string,
    subGoals?: Array<{ intent: string; command: string }>,
    connector: 'sequential' | 'parallel' = 'sequential'
  ): ExecutionPlan {
    return resolveExecutionPlan(this.deps, command, intent, subGoals, connector);
  }

  needsSupplierIntel(command: string, intent: string): boolean {
    return needsSupplierIntel(command, intent);
  }

  async executeParallel(request: ParallelSpecialistRequest): Promise<ParallelSpecialistResult> {
    return executeParallel(this.deps, request);
  }

  async executeSequential(
    requests: SpecialistExecuteRequest[]
  ): Promise<SpecialistExecuteResult[]> {
    return executeSequential(this.deps, requests, (input) => this.resumeFromChild(input));
  }

  async executeGraph(request: GraphExecutionRequest): Promise<GraphExecutionResult> {
    return executeGraph(this.deps, request);
  }

  async executeSpecialist(
    request: SpecialistExecuteRequest
  ): Promise<SpecialistExecuteResult> {
    return executeSpecialist(this.deps, request, (input) => this.resumeFromChild(input));
  }

  async chainHandoff(
    input: ChainHandoffInput,
    onEvent?: SpecialistExecuteRequest['onEvent']
  ): Promise<SpecialistExecuteResult> {
    return chainHandoff(this.deps, input, onEvent);
  }

  async delegate(request: DelegationRequest): Promise<DelegationResult> {
    return delegate(this.deps, request, (req) => this.executeSpecialist(req));
  }

  async resumeFromChild(input: ResumeFromChildInput): Promise<ResumeFromChildResult> {
    return resumeFromChild(this.deps, input);
  }

  async listDelegations(tenantId: string, runId: string): Promise<DelegationRecord[]> {
    return listDelegations(this.deps, tenantId, runId);
  }

  buildReturnPackage(
    parentRunId: string,
    targetAgentKey: string,
    summary: string,
    reflectionIds: string[]
  ): HandoffPackage {
    return buildReturnPackage(this.deps, parentRunId, targetAgentKey, summary, reflectionIds);
  }
}

/** @deprecated Use AgentOrchestrator */
export { AgentOrchestrator as AgentSupervisorOrchestrator };
