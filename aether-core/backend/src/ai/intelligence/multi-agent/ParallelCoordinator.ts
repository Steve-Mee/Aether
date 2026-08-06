import { emitStreamEvent } from '../command-brain/AgentStreamEvents';
import type { AgentRegistry } from './AgentRegistry';
import type { SpecialistAgentRunner } from './SpecialistAgentRunner';
import { wrapAgentEvent } from './agentStreamWrap';
import { getMaxParallelAgents, runWithConcurrency } from './parallelConfig';
import {
  getRetryConfig,
  isIdempotentOperation,
  isRetryEnabled,
  withRetry,
} from './resilience/retryConfig';
import { captureMultiAgentError } from './resilience/errorReporting';
import type { AgentBranchResult, ParallelSpecialistRequest, ParallelSpecialistResult } from './types';

function skippedBranch(agentKey: string, reason: string): AgentBranchResult {
  return {
    agentKey,
    status: 'skipped',
    narrative: '',
    error: reason,
  };
}

export class ParallelCoordinator {
  constructor(
    private registry: AgentRegistry,
    private specialistRunner: SpecialistAgentRunner
  ) {}

  async executeParallel(request: ParallelSpecialistRequest): Promise<ParallelSpecialistResult> {
    emitStreamEvent(request.onEvent, {
      type: 'agent_assigned',
      agentKey: request.agents.map((a) => a.agentKey).join(','),
      executionMode: 'parallel',
    });

    const concurrencyLimit = getMaxParallelAgents();
    const agentsToRun = request.agents.slice(0, concurrencyLimit);
    const skippedSpecs = request.agents.slice(concurrencyLimit);

    for (const spec of skippedSpecs) {
      emitStreamEvent(request.onEvent, {
        type: 'agent_completed',
        agentKey: spec.agentKey,
        error: `Skipped: max parallel agents (${concurrencyLimit})`,
        executionMode: 'parallel',
      });
    }

    const branchTasks = agentsToRun.map((agentSpec) => async (): Promise<AgentBranchResult> => {
      if (request.abortSignal?.aborted) {
        const error = 'cancelled';
        emitStreamEvent(request.onEvent, {
          type: 'agent_completed',
          agentKey: agentSpec.agentKey,
          error,
          executionMode: 'parallel',
        });
        return skippedBranch(agentSpec.agentKey, error);
      }

      emitStreamEvent(request.onEvent, {
        type: 'agent_started',
        agentKey: agentSpec.agentKey,
        executionMode: 'parallel',
      });

      const def = this.registry.resolveByKey(agentSpec.agentKey);
      if (!def) {
        const error = `Unknown agent: ${agentSpec.agentKey}`;
        emitStreamEvent(request.onEvent, {
          type: 'agent_completed',
          agentKey: agentSpec.agentKey,
          error,
          executionMode: 'parallel',
        });
        return {
          agentKey: agentSpec.agentKey,
          status: 'failed',
          narrative: '',
          error,
        };
      }

      try {
        const retryConfig = getRetryConfig();
        const isIdempotent = isIdempotentOperation(agentSpec.agentKey, false);
        const shouldRetry = isRetryEnabled() && isIdempotent;

        const executeAgent = async () =>
          this.specialistRunner.runWithDefinition(def, {
            tenantId: request.tenantId,
            agentKey: agentSpec.agentKey,
            intent: agentSpec.intent,
            command: request.command,
            contextSnippets: agentSpec.contextSnippets ?? [],
            handlerResult: `Parallel sub-task: ${agentSpec.intent}`,
            parentRunId: request.parentRunId,
            actorId: request.actorId,
            collectiveSnippets: request.collectiveSnippets,
            memoryPromptBlock: request.memoryPromptBlock,
            deferToTools: request.deferToTools,
            adaptiveLearningEnabled: request.adaptiveLearningEnabled,
            onEvent: wrapAgentEvent(request.onEvent, agentSpec.agentKey),
            abortSignal: request.abortSignal,
            explainabilityCollector: request.explainabilityCollector,
          });

        const result = shouldRetry
          ? await withRetry(executeAgent, retryConfig, isIdempotent, (attempt, error) => {
              emitStreamEvent(request.onEvent, {
                type: 'agent_started',
                agentKey: agentSpec.agentKey,
                executionMode: 'parallel',
              });
            })
          : await executeAgent();

        if (request.abortSignal?.aborted) {
          const error = 'cancelled';
          emitStreamEvent(request.onEvent, {
            type: 'agent_completed',
            agentKey: agentSpec.agentKey,
            error,
            executionMode: 'parallel',
          });
          return skippedBranch(agentSpec.agentKey, error);
        }

        const summary =
          result.handoffPackage?.summary ??
          (result.narrative ? result.narrative.slice(0, 200) : undefined);

        emitStreamEvent(request.onEvent, {
          type: 'agent_completed',
          agentKey: agentSpec.agentKey,
          summary,
          error: result.error,
          executionMode: 'parallel',
        });

        return {
          ...result,
          agentKey: agentSpec.agentKey,
          status: result.error ? 'failed' : 'completed',
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Parallel agent failed';
        const error = err instanceof Error ? err : new Error(message);
        
        captureMultiAgentError(error, {
          agentKey: agentSpec.agentKey,
          intent: agentSpec.intent,
          executionMode: 'parallel',
          tenantId: request.tenantId,
          parentRunId: request.parentRunId,
        });

        emitStreamEvent(request.onEvent, {
          type: 'agent_completed',
          agentKey: agentSpec.agentKey,
          error: message,
          executionMode: 'parallel',
        });
        return {
          agentKey: agentSpec.agentKey,
          status: 'failed',
          narrative: '',
          error: message,
        };
      }
    });

    const branchResults = await runWithConcurrency(branchTasks, concurrencyLimit);
    const skippedResults = skippedSpecs.map((spec) =>
      skippedBranch(spec.agentKey, `Skipped: max parallel agents (${concurrencyLimit})`)
    );
    const results = [...branchResults, ...skippedResults];

    const narratives = results
      .map((r) => {
        if (r.status === 'skipped') return `[${r.agentKey}] Skipped: ${r.error}`;
        if (!r.narrative && r.error) return `[${r.agentKey}] Error: ${r.error}`;
        if (r.narrative) return `[${r.agentKey}] ${r.narrative}`;
        return '';
      })
      .filter(Boolean);

    const mergedToolTrace = results.flatMap((r) => r.toolTrace ?? []);
    const pendingActions = results.flatMap((r) => r.pendingActions ?? []);
    const agentRunIds = results.map((r) => r.agentRunId).filter((id): id is string => Boolean(id));
    const checkpoint = results.some((r) => r.checkpoint && r.status === 'completed');

    return {
      results,
      mergedNarrative: narratives.join('\n\n'),
      mergedToolTrace,
      pendingActions,
      agentRunIds,
      checkpoint,
    };
  }
}
