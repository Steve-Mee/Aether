export interface AgentPerformanceDto {
  agentKey: string;
  successRate: number;
  avgLatencyMs?: number;
  recentFailures: number;
  sampleSize: number;
  displayName?: string;
}

export interface AgentMetricsResponse {
  agents: AgentPerformanceDto[];
}

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
  activity: import('./activity').ActivityItem[];
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

export interface AgentsRosterResponse {
  agents: AgentRosterEntry[];
}
