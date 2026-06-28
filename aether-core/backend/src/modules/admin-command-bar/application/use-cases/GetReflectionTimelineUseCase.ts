import type { LongTermMemoryStore } from '../../../../ai/intelligence/personal-brain/memory/LongTermMemoryStore';
import { ReflectionHandoffStore } from '../../../../ai/intelligence/personal-brain/reflection/ReflectionHandoffStore';
import { listBrainAgentRunsForTimeline } from '../../../../ai/intelligence/command-brain/BrainAgentRunStore';
import type { AgentMessage, AgentReflectionMessage } from '../../../../ai/intelligence/command-brain/AgentTranscript';
import type {
  ReflectionTimelineQuery,
  ReflectionTimelineResult,
  ReflectionTimelineEntry,
} from './reflectionTimelineTypes';

export class GetReflectionTimelineUseCase {
  private handoffStore = new ReflectionHandoffStore();

  constructor(private longTerm: LongTermMemoryStore) {}

  async execute(query: ReflectionTimelineQuery): Promise<ReflectionTimelineResult> {
    const limit = query.limit ?? 50;
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    const items: ReflectionTimelineEntry[] = [];

    const agentKeys = query.agentKey ? [query.agentKey] : ['admin', 'mail', 'supplier'];
    for (const agentKey of agentKeys) {
      const reflections = await this.longTerm.listReflections(query.tenantId, limit, agentKey);
      for (const r of reflections) {
        const ts = r.timestamp ?? new Date().toISOString();
        if (from && new Date(ts) < from) continue;
        if (to && new Date(ts) > to) continue;
        items.push({
          id: r.id,
          timestamp: ts,
          kind: 'experience',
          agentKey,
          summary: r.summary,
          goalReached: r.reflectionPayload?.success,
          reflectionPayload: r.reflectionPayload as Record<string, unknown> | undefined,
        });
      }
    }

    const runs = await listBrainAgentRunsForTimeline(query.tenantId, {
      from,
      to,
      agentKey: query.agentKey,
      limit,
    });

    for (const run of runs) {
      let transcript: AgentMessage[] = [];
      try {
        transcript = JSON.parse(run.transcript) as AgentMessage[];
      } catch {
        transcript = [];
      }
      for (const msg of transcript) {
        if (msg.role !== 'reflection') continue;
        const reflectionMsg = msg as AgentReflectionMessage;
        items.push({
          id: `${run.id}:${reflectionMsg.planStep ?? items.length}`,
          timestamp: run.createdAt.toISOString(),
          kind: 'step',
          agentKey: run.agentKey,
          runId: run.id,
          delegationId: run.delegationId ?? undefined,
          summary: `${reflectionMsg.observation} → ${reflectionMsg.nextAction}`.slice(0, 300),
        });
      }
    }

    if (query.includeHandoffs !== false) {
      const handoffs = await this.handoffStore.listForTenant(query.tenantId, {
        from,
        to,
        sourceAgentKey: query.agentKey,
        limit,
      });
      for (const h of handoffs) {
        items.push({
          id: h.id,
          timestamp: h.createdAt.toISOString(),
          kind: 'handoff',
          agentKey: h.sourceAgentKey,
          sourceAgentKey: h.sourceAgentKey,
          handoffTarget: h.targetAgentKey,
          delegationId: h.delegationId ?? undefined,
          runId: h.childRunId ?? h.parentRunId ?? undefined,
          summary: h.summary,
        });
      }
    }

    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const sliced = items.slice(0, limit);

    return { items: sliced, total: items.length };
  }
}
