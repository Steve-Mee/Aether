import type { ExecutionMode } from '../types';
import type { ParallelSpecialistRequest, ParallelSpecialistResult } from '../types';
import type { SpecialistExecuteRequest, SpecialistExecuteResult } from '../types';

export interface GraphExecutionRequest extends ParallelSpecialistRequest {
  intent: string;
  subGoals?: Array<{ intent: string; command: string }>;
  contextSnippets?: string[];
  graphDefinition?: import('./types').GraphDefinition;
}

export interface GraphExecutionResult {
  mode: ExecutionMode;
  parallelResult?: ParallelSpecialistResult;
  sequentialResults?: SpecialistExecuteResult[];
  mergedNarrative: string;
}

export interface GraphOrchestratorPort {
  isEnabled(): boolean;
  executeGraph(request: GraphExecutionRequest): Promise<GraphExecutionResult>;
}
