import { PrismaAgentPerformanceAdapter } from '../../../../ai/intelligence/multi-agent/routing/PrismaAgentPerformanceAdapter';
import type { AgentPerformanceSnapshot } from '../../../../ai/intelligence/multi-agent/routing/AgentPerformancePort';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import type { AgentRegistry } from '../../../../ai/intelligence/multi-agent/AgentRegistry';

export interface AgentPerformanceDto extends AgentPerformanceSnapshot {
  displayName?: string;
}

const performanceAdapter = new PrismaAgentPerformanceAdapter();

export async function buildAgentMetrics(
  tenantId: string,
  agentRegistry: AgentRegistry | undefined,
  _days?: number,
): Promise<{ agents: AgentPerformanceDto[] }> {
  const tid = requireTenantId(tenantId, 'AgentMetrics.build');
  const keys =
    agentRegistry
      ?.list()
      .map((d) => d.agentKey)
      .filter((k) => k !== 'global-advisory') ?? [];

  if (keys.length === 0) {
    return { agents: [] };
  }

  const snapshots = await performanceAdapter.getTenantAgentScores(tid, keys);
  const nameByKey = new Map(
    agentRegistry?.list().map((d) => [d.agentKey, d.displayName ?? d.agentKey]) ?? [],
  );

  return {
    agents: snapshots.map((s) => ({
      ...s,
      displayName: nameByKey.get(s.agentKey) ?? s.agentKey,
    })),
  };
}
