import type { AdminDataPort } from '../../../modules/admin-command-bar/application/ports/AdminDataPort';
import type { AgentKey } from '../multi-agent/types';

export type ProactiveRiskLevel = 'low' | 'medium' | 'high';
export type ProactiveExecutionMode = 'autonomous' | 'approval_required' | 'inform_only';
export type ProactiveTriggerMode = 'periodic' | 'event';

export interface ProactiveEvalContext {
  tenantId: string;
  adminData: AdminDataPort;
  eventPayload?: Record<string, unknown>;
}

export interface ProactiveFinding {
  triggerId: string;
  dedupeKey: string;
  agentKey: AgentKey;
  title: string;
  summary?: string;
  command: string;
  intentId: string;
  category: string;
  riskLevel: ProactiveRiskLevel;
  executionMode: ProactiveExecutionMode;
  priority: number;
  evidence: Record<string, unknown>;
  clusterKey?: string;
  goalId?: string;
}

export interface ProactiveTriggerDefinition {
  id: string;
  agentKey: AgentKey;
  category: string;
  mode: ProactiveTriggerMode;
  eventType?: string;
  evaluate(ctx: ProactiveEvalContext): Promise<ProactiveFinding[]>;
  defaultRiskLevel: ProactiveRiskLevel;
  cooldownMs: number;
}
