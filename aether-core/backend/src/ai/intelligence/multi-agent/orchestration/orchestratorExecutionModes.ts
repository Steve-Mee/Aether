import { emitStreamEvent } from '../../command-brain/AgentStreamEvents';
import { isRunMemoryEnabled } from '../memory/runMemoryConfig';
import type { GraphExecutionRequest, GraphExecutionResult } from '../graph/GraphOrchestratorPort';
import type {
  ParallelSpecialistRequest,
  ParallelSpecialistResult,
  ResumeFromChildInput,
  ResumeFromChildResult,
  SpecialistExecuteRequest,
  SpecialistExecuteResult,
} from '../types';
import { executeSpecialistCore } from './orchestratorSpecialistExecution';
import type { OrchestratorDeps } from './orchestratorDeps';

export async function executeParallel(
  deps: OrchestratorDeps,
  request: ParallelSpecialistRequest
): Promise<ParallelSpecialistResult> {
  if (!deps.parallelCoordinator) {
    return {
      results: [],
      mergedNarrative: '',
      mergedToolTrace: [],
      pendingActions: [],
      agentRunIds: [],
    };
  }
  const result = await deps.parallelCoordinator.executeParallel(request);

  if (
    deps.sharedMemoryBridge &&
    request.parentRunId &&
    isRunMemoryEnabled() &&
    result.results.length > 0
  ) {
    const contributions = result.results.map((r) => ({
      agentKey: r.agentKey,
      summary: r.narrative?.slice(0, 200) ?? r.error ?? 'No output',
      status: (r.status === 'failed' || r.error ? 'failed' : 'completed') as 'completed' | 'failed',
    }));
    await deps.sharedMemoryBridge.recordContributions({
      tenantId: request.tenantId,
      runId: request.parentRunId,
      contributions,
      onEvent: request.onEvent,
    });
  }

  return result;
}

export async function executeSequential(
  deps: OrchestratorDeps,
  requests: SpecialistExecuteRequest[],
  resumeFromChild: (input: ResumeFromChildInput) => Promise<ResumeFromChildResult>
): Promise<SpecialistExecuteResult[]> {
  const results: SpecialistExecuteResult[] = [];
  let chainContext: string[] = [];

  if (requests.length > 0) {
    emitStreamEvent(requests[0].onEvent, {
      type: 'agent_assigned',
      agentKey: requests.map((r) => r.agentKey).join(','),
      executionMode: 'sequential',
    });
  }

  for (const req of requests) {
    if (req.abortSignal?.aborted) {
      break;
    }

    emitStreamEvent(req.onEvent, {
      type: 'agent_started',
      agentKey: req.agentKey,
      executionMode: 'sequential',
    });

    const result = await executeSpecialistCore(
      deps,
      {
        ...req,
        chainContext: [...chainContext, ...(req.chainContext ?? [])],
        skipCollaborationChain: true,
      },
      resumeFromChild
    );
    results.push(result);

    emitStreamEvent(req.onEvent, {
      type: 'agent_completed',
      agentKey: req.agentKey,
      executionMode: 'sequential',
      error: result.error,
    });

    if (req.abortSignal?.aborted) {
      break;
    }
    if (result.narrative) {
      chainContext = [...chainContext, result.narrative];
    } else if (result.error) {
      chainContext = [...chainContext, `[${req.agentKey} error] ${result.error}`];
    }
  }

  if (deps.sharedMemoryBridge && requests[0]?.parentRunId && isRunMemoryEnabled()) {
    const contributions = results.map((r, i) => ({
      agentKey: requests[i]?.agentKey ?? 'admin',
      summary: r.narrative?.slice(0, 200) ?? r.error ?? 'No output',
      status: (r.error ? 'failed' : 'completed') as 'completed' | 'failed',
    }));
    await deps.sharedMemoryBridge.recordContributions({
      tenantId: requests[0].tenantId,
      runId: requests[0].parentRunId!,
      contributions,
      onEvent: requests[0].onEvent,
    });
  }

  return results;
}

export async function executeGraph(
  deps: OrchestratorDeps,
  request: GraphExecutionRequest
): Promise<GraphExecutionResult> {
  if (!deps.graphOrchestrator?.isEnabled()) {
    return { mode: 'single', mergedNarrative: '' };
  }
  return deps.graphOrchestrator.executeGraph(request);
}
