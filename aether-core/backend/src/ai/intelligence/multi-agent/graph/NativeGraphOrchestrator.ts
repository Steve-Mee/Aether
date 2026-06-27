import { isMutatingIntent } from '../../command-brain/BrainActionPolicyResolver';
import type { AgentRegistry } from '../AgentRegistry';
import type { ParallelCoordinator } from '../ParallelCoordinator';
import type { SpecialistAgentRunner } from '../SpecialistAgentRunner';
import type { SpecialistExecuteRequest, SpecialistExecuteResult } from '../types';
import { isGraphOrchestrationEnabled } from './graphOrchestrationConfig';
import type {
  GraphExecutionRequest,
  GraphExecutionResult,
  GraphOrchestratorPort,
} from './GraphOrchestratorPort';

export class NativeGraphOrchestrator implements GraphOrchestratorPort {
  constructor(
    private agentRegistry: AgentRegistry,
    private specialistRunner?: SpecialistAgentRunner,
    private parallelCoordinator?: ParallelCoordinator,
    private executeSequential?: (requests: SpecialistExecuteRequest[]) => Promise<SpecialistExecuteResult[]>
  ) {}

  isEnabled(): boolean {
    return isGraphOrchestrationEnabled();
  }

  async executeGraph(request: GraphExecutionRequest): Promise<GraphExecutionResult> {
    const subGoals = request.subGoals ?? request.agents.map((a) => ({ intent: a.intent, command: request.command }));
    const agents = subGoals
      .map((step) => {
        const def = this.agentRegistry.resolveByIntent(step.intent);
        return def
          ? { agentKey: def.agentKey, intent: step.intent, command: step.command }
          : null;
      })
      .filter((a): a is { agentKey: string; intent: string; command: string } => a !== null);

    if (agents.length === 0) {
      return { mode: 'single', mergedNarrative: '' };
    }

    const hasMutating = subGoals.some((s) => isMutatingIntent(s.intent));
    const mode = hasMutating ? 'sequential' : 'parallel';

    if (mode === 'parallel' && this.parallelCoordinator) {
      const parallelResult = await this.parallelCoordinator.executeParallel({
        ...request,
        agents: agents.map((a) => ({ agentKey: a.agentKey, intent: a.intent })),
      });
      return {
        mode: 'parallel',
        parallelResult,
        mergedNarrative: parallelResult.mergedNarrative,
      };
    }

    if (!this.executeSequential) {
      return { mode: 'sequential', mergedNarrative: '' };
    }

    const sequentialResults = await this.executeSequential(
      agents.map((a) => ({
        tenantId: request.tenantId,
        agentKey: a.agentKey,
        intent: a.intent,
        command: a.command,
        contextSnippets: request.contextSnippets ?? request.agents[0]?.contextSnippets ?? [],
        handlerResult: `Graph sub-task: ${a.intent}`,
        actorId: request.actorId,
        collectiveSnippets: request.collectiveSnippets,
        memoryPromptBlock: request.memoryPromptBlock,
        deferToTools: request.deferToTools,
        adaptiveLearningEnabled: request.adaptiveLearningEnabled,
        onEvent: request.onEvent,
      }))
    );

    return {
      mode: 'sequential',
      sequentialResults,
      mergedNarrative: sequentialResults.map((r) => r.narrative).filter(Boolean).join('\n\n'),
    };
  }
}
