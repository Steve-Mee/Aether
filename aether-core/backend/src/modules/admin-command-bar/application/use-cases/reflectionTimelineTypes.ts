export type ReflectionTimelineKind =
  | 'step'
  | 'experience'
  | 'handoff'
  | 'adaptive_hint'
  | 'distillation_draft';

export interface ReflectionTimelineEntry {
  id: string;
  timestamp: string;
  kind: ReflectionTimelineKind;
  agentKey: string;
  sourceAgentKey?: string;
  runId?: string;
  delegationId?: string;
  summary: string;
  goalReached?: boolean;
  reflectionPayload?: Record<string, unknown>;
  handoffTarget?: string;
}

export interface ReflectionTimelineQuery {
  tenantId: string;
  from?: string;
  to?: string;
  agentKey?: string;
  includeHandoffs?: boolean;
  limit?: number;
}

export interface ReflectionTimelineResult {
  items: ReflectionTimelineEntry[];
  total: number;
}
