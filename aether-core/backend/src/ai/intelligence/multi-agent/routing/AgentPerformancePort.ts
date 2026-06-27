export interface AgentPerformanceSnapshot {
  agentKey: string;
  successRate: number;
  avgLatencyMs?: number;
  recentFailures: number;
  sampleSize: number;
}

export interface AgentPerformancePort {
  getTenantAgentScores(
    tenantId: string,
    agentKeys: string[]
  ): Promise<AgentPerformanceSnapshot[]>;
  getPairSuccessRate(tenantId: string, from: string, to: string): Promise<number | null>;
}
