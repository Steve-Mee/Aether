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
  | 'agent_started'
  | 'agent_completed'
  | 'agent_handoff'
  | 'agent_peer_message'
  | 'peer_job_queued'
  | 'peer_job_completed'
  | 'peer_job_failed'
  | 'handoff_chain_update'
  | 'shared_memory_updated'
  | 'explain_update'
  | 'run_started'
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
  fromAgentKey?: string;
  toAgentKey?: string;
  handoffReason?: string;
  handoffMode?: 'direct' | 'orchestrated';
  jobId?: string;
  handoffChain?: import('../multi-agent/types').HandoffChainEntry[];
  executionMode?: 'single' | 'sequential' | 'parallel';
  commandId?: string;
  correlationId?: string;
  messageType?: import('../multi-agent/types').AgentPeerMessageType;
  namespace?: string;
  key?: string;
  valuePreview?: string;
  explainSections?: import('../explainability/types').ExplainabilitySection[];
  flowGraph?: import('../explainability/types').FlowGraph;
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
