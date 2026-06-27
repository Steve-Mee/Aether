import type { AgentPlanStep } from './types/AgentPlan';

export type AgentStreamEventType =
  | 'thinking'
  | 'plan_ready'
  | 'plan_revised'
  | 'reflection'
  | 'step_progress'
  | 'tool_start'
  | 'tool_result'
  | 'proposal_ready'
  | 'narrative_delta'
  | 'checkpoint'
  | 'global_knowledge_synced'
  | 'agent_assigned'
  | 'done'
  | 'error';

export type StepProgressStatus = 'running' | 'done' | 'failed' | 'skipped';

export interface AgentStreamEvent {
  type: AgentStreamEventType;
  step?: number;
  planStep?: number;
  planStepTotal?: number;
  stepStatus?: StepProgressStatus;
  goal?: string;
  steps?: AgentPlanStep[];
  stepTotal?: number;
  tool?: string;
  proposalId?: string;
  summary?: string;
  output?: string;
  narrative?: string;
  observation?: string;
  nextAction?: string;
  revision?: number;
  error?: string;
  runStatus?: 'running' | 'completed' | 'failed' | 'awaiting_approval' | 'cancelled';
  agentKey?: string;
  timestamp: string;
}

export type AgentStreamCallback = (event: AgentStreamEvent) => void;

export function emitStreamEvent(
  onEvent: AgentStreamCallback | undefined,
  event: Omit<AgentStreamEvent, 'timestamp'>
): void {
  if (!onEvent) return;
  onEvent({ ...event, timestamp: new Date().toISOString() });
}
