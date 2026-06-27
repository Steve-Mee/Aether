import type { AgentRegistry } from './AgentRegistry';
import type { SpecialistAgentRunner } from './SpecialistAgentRunner';
import type { ParallelSpecialistRequest, ParallelSpecialistResult } from './types';

export class ParallelCoordinator {
  constructor(
    private registry: AgentRegistry,
    private specialistRunner: SpecialistAgentRunner
  ) {}

  async executeParallel(request: ParallelSpecialistRequest): Promise<ParallelSpecialistResult> {
    const results = await Promise.all(
      request.agents.map(async (agentSpec) => {
        const def = this.registry.resolveByKey(agentSpec.agentKey);
        if (!def) {
          return {
            narrative: '',
            error: `Unknown agent: ${agentSpec.agentKey}`,
          };
        }
        try {
          return await this.specialistRunner.runWithDefinition(def, {
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
            onEvent: request.onEvent,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Parallel agent failed';
          return { narrative: '', error: message };
        }
      })
    );

    const narratives = results
      .map((r, i) => {
        const spec = request.agents[i];
        if (!r.narrative && r.error) return `[${spec.agentKey}] Error: ${r.error}`;
        if (r.narrative) return `[${spec.agentKey}] ${r.narrative}`;
        return '';
      })
      .filter(Boolean);

    const mergedToolTrace = results.flatMap((r) => r.toolTrace ?? []);
    const pendingActions = results.flatMap((r) => r.pendingActions ?? []);
    const agentRunIds = results.map((r) => r.agentRunId).filter((id): id is string => Boolean(id));
    const checkpoint = results.some((r) => r.checkpoint);

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
