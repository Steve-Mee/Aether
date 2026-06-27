import type {
  DelegationRecord,
  DelegationRequest,
  DelegationResult,
  ExecutionPlan,
  ParallelSpecialistRequest,
  ParallelSpecialistResult,
  ResumeFromChildInput,
  ResumeFromChildResult,
  RouteDecision,
  SpecialistAgentDefinition,
  SpecialistExecuteRequest,
  SpecialistExecuteResult,
} from './types';
import type { GraphExecutionRequest, GraphExecutionResult } from './graph/GraphOrchestratorPort';

export interface AgentSupervisorPort {
  isDelegationEnabled(): boolean;
  isGraphOrchestrationEnabled?(): boolean;
  resolveTargetAgent(intent: string): string | null;
  route?(
    intent: string,
    command?: string,
    options?: { confidence?: number; onEvent?: SpecialistExecuteRequest['onEvent'] }
  ): Promise<SpecialistAgentDefinition | null>;
  routeDecision?(
    intent: string,
    command?: string,
    options?: { confidence?: number }
  ): Promise<RouteDecision>;
  resolveExecutionPlan?(
    command: string,
    intent: string,
    subGoals?: Array<{ intent: string; command: string }>
  ): ExecutionPlan;
  executeSpecialist?(request: SpecialistExecuteRequest): Promise<SpecialistExecuteResult>;
  executeParallel?(request: ParallelSpecialistRequest): Promise<ParallelSpecialistResult>;
  executeSequential?(requests: SpecialistExecuteRequest[]): Promise<SpecialistExecuteResult[]>;
  executeGraph?(request: GraphExecutionRequest): Promise<GraphExecutionResult>;
  delegate(request: DelegationRequest): Promise<DelegationResult>;
  resumeFromChild(input: ResumeFromChildInput): Promise<ResumeFromChildResult>;
  listDelegations(tenantId: string, runId: string): Promise<DelegationRecord[]>;
}
