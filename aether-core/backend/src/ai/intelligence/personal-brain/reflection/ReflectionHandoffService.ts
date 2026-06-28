import type { LongTermMemoryStore } from '../memory/LongTermMemoryStore';
import { MEMORY_KIND_SEMANTIC } from '../memory/constants';
import { DEFAULT_BRAIN_AGENT_KEY } from '../../global-knowledge/constants';
import type { HandoffPackage } from '../../multi-agent/types';
import { canHandoffReflection } from './CrossAgentReflectionPolicy';
import type { ReflectionHandoffStore } from './ReflectionHandoffStore';
import type { ExperienceReflection } from './types';

export interface ReflectionHandoffResult {
  handoffCount: number;
  semanticIds: string[];
  handoffLogId?: string;
}

export class ReflectionHandoffService {
  constructor(
    private longTerm: LongTermMemoryStore,
    private handoffStore?: ReflectionHandoffStore
  ) {}

  async handoffToAdmin(
    tenantId: string,
    sourceAgentKey: string,
    targetAgentKey = DEFAULT_BRAIN_AGENT_KEY,
    options?: { delegationId?: string; parentRunId?: string; childRunId?: string }
  ): Promise<ReflectionHandoffResult> {
    if (!canHandoffReflection(sourceAgentKey, targetAgentKey)) {
      return { handoffCount: 0, semanticIds: [] };
    }

    const reflections = await this.longTerm.listReflections(tenantId, 20, sourceAgentKey);
    const semanticIds: string[] = [];
    let handoffCount = 0;
    const reflectionIds: string[] = [];

    for (const match of reflections) {
      const payload = match.reflectionPayload;
      if (!payload || match.consolidatedAt) continue;

      const fact = buildHandoffFact(payload, sourceAgentKey);
      const id = await this.longTerm.store({
        tenantId,
        agentKey: targetAgentKey,
        command: 'Cross-agent leerpunt',
        intent: payload.intent,
        summary: fact,
        priority: 'medium',
        memoryKind: MEMORY_KIND_SEMANTIC,
        sourceAgentKey,
        handoffAt: new Date().toISOString(),
      });
      semanticIds.push(id);
      reflectionIds.push(match.id);
      handoffCount += 1;
      await this.longTerm.markConsolidated(tenantId, match.id, sourceAgentKey).catch(() => undefined);
    }

    let handoffLogId: string | undefined;
    if (handoffCount > 0 && this.handoffStore) {
      handoffLogId = await this.handoffStore.persist({
        tenantId,
        sourceAgentKey,
        targetAgentKey,
        reflectionIds,
        summary: `${handoffCount} reflection(s) from ${sourceAgentKey}`,
        delegationId: options?.delegationId,
        parentRunId: options?.parentRunId,
        childRunId: options?.childRunId,
      });
    }

    return { handoffCount, semanticIds, handoffLogId };
  }

  buildReturnPackage(
    sourceAgentKey: string,
    targetAgentKey: string,
    summary: string,
    reflectionIds: string[],
    delegationId?: string
  ): HandoffPackage {
    return {
      sourceAgentKey,
      targetAgentKey,
      reflectionIds,
      summary,
      delegationId,
    };
  }
}

function buildHandoffFact(reflection: ExperienceReflection, sourceAgentKey: string): string {
  const learnings = reflection.futureLearnings.join('; ') || reflection.outcome;
  return `[${sourceAgentKey}] ${reflection.intent}: ${learnings}`.slice(0, 200);
}
