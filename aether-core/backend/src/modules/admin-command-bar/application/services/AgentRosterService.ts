import { prisma } from '../../../../shared/prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import type { AgentRegistry } from '../../../../ai/intelligence/multi-agent/AgentRegistry';
import { buildActivityFeed, resolveActivitySince } from './ActivityFeedService';

const ACTIVE_WINDOW_MS = 15 * 60 * 1000;

export interface AgentRosterEntry {
  agentKey: string;
  displayName: string;
  description: string;
  supportedIntents: string[];
  canDelegateTo: string[];
  status: 'active' | 'idle';
  proactiveCount: number;
  recentActionCount: number;
  lastActiveAt?: string;
}

export interface AgentActivityResponse {
  agentKey: string;
  activity: Awaited<ReturnType<typeof buildActivityFeed>>['items'];
  proactiveSuggestions: Array<{
    id: string;
    title: string;
    summary: string | null;
    command: string;
    triggerId: string;
    status: string;
    createdAt: string;
  }>;
  explainability: Array<{
    id: string;
    sourceType: string;
    sourceId: string;
    summary: string;
    agentKeys: string[];
    createdAt: string;
  }>;
}

function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]?/);
  return match ? match[0].trim() : text.slice(0, 120);
}

export class AgentRosterService {
  constructor(private agentRegistry: AgentRegistry) {}

  async buildRoster(tenantId: string): Promise<AgentRosterEntry[]> {
    const tid = requireTenantId(tenantId, 'AgentRoster.buildRoster');
    const since7d = new Date(Date.now() - 7 * 86400000);
    const sinceActive = new Date(Date.now() - ACTIVE_WINDOW_MS);

    const definitions = this.agentRegistry.list().filter((d) => d.agentKey !== 'global-advisory');

    const [activeRuns, proactiveRows, explainRows, lastRuns] = await Promise.all([
      prisma.brainAgentRun.findMany({
        where: { tenantId: tid, updatedAt: { gte: sinceActive } },
        select: { agentKey: true },
        distinct: ['agentKey'],
      }),
      prisma.proactiveSuggestion.groupBy({
        by: ['agentKey'],
        where: {
          tenantId: tid,
          status: { in: ['active', 'snoozed'] },
        },
        _count: { _all: true },
      }),
      prisma.agentExplainabilitySnapshot.findMany({
        where: { tenantId: tid, createdAt: { gte: since7d } },
        select: { agentKeys: true },
      }),
      prisma.brainAgentRun.findMany({
        where: { tenantId: tid, agentKey: { in: definitions.map((d) => d.agentKey) } },
        orderBy: { updatedAt: 'desc' },
        distinct: ['agentKey'],
        select: { agentKey: true, updatedAt: true },
      }),
    ]);

    const activeSet = new Set(activeRuns.map((r) => r.agentKey));
    const proactiveByAgent = new Map<string, number>();
    for (const row of proactiveRows) {
      if (row.agentKey) proactiveByAgent.set(row.agentKey, row._count._all);
    }

    const recentCountByAgent = new Map<string, number>();
    for (const row of explainRows) {
      for (const key of row.agentKeys) {
        recentCountByAgent.set(key, (recentCountByAgent.get(key) ?? 0) + 1);
      }
    }

    const lastActiveByAgent = new Map(lastRuns.map((r) => [r.agentKey, r.updatedAt.toISOString()]));

    return definitions.map((def) => ({
      agentKey: def.agentKey,
      displayName: def.displayName ?? def.agentKey,
      description: firstSentence(def.rolePrompt),
      supportedIntents: [...def.supportedIntents],
      canDelegateTo: [...(def.canDelegateTo ?? [])],
      status: activeSet.has(def.agentKey) ? 'active' : 'idle',
      proactiveCount: proactiveByAgent.get(def.agentKey) ?? 0,
      recentActionCount: recentCountByAgent.get(def.agentKey) ?? 0,
      lastActiveAt: lastActiveByAgent.get(def.agentKey),
    }));
  }

  async getAgentActivity(
    tenantId: string,
    agentKey: string,
    days = 7
  ): Promise<AgentActivityResponse> {
    const tid = requireTenantId(tenantId, 'AgentRoster.getAgentActivity');
    const since = resolveActivitySince(days);

    const [activityFeed, proactiveRows, explainRows] = await Promise.all([
      buildActivityFeed({ tenantId: tid, since, limit: 50, agentKey }),
      prisma.proactiveSuggestion.findMany({
        where: {
          tenantId: tid,
          agentKey,
          status: { in: ['active', 'snoozed', 'executed', 'dismissed'] },
          createdAt: { gte: since },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      prisma.agentExplainabilitySnapshot.findMany({
        where: {
          tenantId: tid,
          agentKeys: { has: agentKey },
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          sourceType: true,
          sourceId: true,
          summary: true,
          agentKeys: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      agentKey,
      activity: activityFeed.items,
      proactiveSuggestions: proactiveRows.map((r) => ({
        id: r.id,
        title: r.title,
        summary: r.summary,
        command: r.command,
        triggerId: r.triggerId,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
      explainability: explainRows.map((r) => ({
        id: r.id,
        sourceType: r.sourceType,
        sourceId: r.sourceId,
        summary: r.summary,
        agentKeys: r.agentKeys,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}
