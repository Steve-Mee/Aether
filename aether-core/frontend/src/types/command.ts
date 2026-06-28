/**
 * Natural-language command bar types.
 * @see POST /api/admin/command, POST /api/admin/command/:id/undo, GET /api/admin/commands
 */

export type AgentMessageRole =
  | 'system'
  | 'user'
  | 'assistant'
  | 'tool'
  | 'proposal'
  | 'plan'
  | 'reflection';

export interface AgentTextMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AgentToolMessage {
  role: 'tool';
  toolCallId: string;
  tool: string;
  output: string;
  status?: 'ok' | 'error' | 'proposed';
}

export interface AgentProposalMessage {
  role: 'proposal';
  proposalId: string;
  tool: string;
  summary: string;
  risk: string;
}

export interface AgentPlanStep {
  index: number;
  label: string;
  toolHint?: string;
  riskHint?: 'low' | 'medium' | 'high';
}

export interface AgentPlanMessage {
  role: 'plan';
  goal: string;
  steps: AgentPlanStep[];
  reasoning?: string;
  revision?: number;
  supersedes?: string;
}

export interface AgentReflectionMessage {
  role: 'reflection';
  observation: string;
  nextAction: string;
  planStep?: number;
}

export type AgentMessage =
  | AgentTextMessage
  | AgentToolMessage
  | AgentProposalMessage
  | AgentPlanMessage
  | AgentReflectionMessage;

export type AgentStreamEventType =
  | 'thinking'
  | 'plan_ready'
  | 'plan_revised'
  | 'reflection'
  | 'step_progress'
  | 'tool_start'
  | 'tool_result'
  | 'proposal_ready'
  | 'checkpoint'
  | 'narrative_delta'
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
  | 'run_started'
  | 'done'
  | 'error'
  | 'explain_update'
  | 'result';

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
  handoffChain?: HandoffChainEntry[];
  executionMode?: 'single' | 'sequential' | 'parallel';
  commandId?: string;
  namespace?: string;
  key?: string;
  valuePreview?: string;
  explainSections?: import('./explainability').ExplainabilitySection[];
  flowGraph?: import('./explainability').FlowGraph;
  timestamp?: string;
  result?: CommandResult;
}

export interface SharedMemoryEntry {
  namespace: string;
  key: string;
  updatedByAgentKey?: string;
  updatedAt?: string;
  valuePreview?: string;
}

export type RouteSource = 'intent' | 'keyword' | 'llm' | 'llm-plan' | 'none';

export interface AgentContribution {
  agentKey: string;
  summary: string;
  status: 'completed' | 'failed';
}

export interface ActionConflict {
  description: string;
  resolution: 'user_choice' | 'merged';
}

export type SynthesisSource = 'llm' | 'structured' | 'concat';

export interface SpecialistMeta {
  agentKey: string;
  delegatedFrom: string;
  specialistRunId?: string;
  handoffSummary?: string;
  routingSource?: RouteSource;
}

export interface HandoffChainEntry {
  from: string;
  to: string;
  reason: string;
  mode: 'sync' | 'async';
  jobId?: string;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  summary?: string;
  planDepth?: number;
  handoffMode?: 'direct' | 'orchestrated';
  messageType?: 'intel' | 'request' | 'notify';
  correlationId?: string;
}

export interface AgentRunSummary {
  goalReached: boolean;
  completedSteps: Array<{ label: string; tool?: string }>;
  failedSteps: Array<{ label: string; error?: string }>;
  pendingApprovals: number;
  narrative: string;
  reflections?: string[];
  planRevisions?: number;
}

export interface AgentPlan {
  goal: string;
  steps: AgentPlanStep[];
  reasoning?: string;
  revision?: number;
  supersedes?: string;
}

/** Result of executing a merchant command via the admin parser. */
export interface CommandResult {
  success: boolean;
  originalCommand?: string;
  result: string;
  parsedIntent: string;
  action?: string;
  confidence: number;
  verifiedUplift?: number;
  timestamp?: string;
  requiresApproval?: boolean;
  riskBand?: 'low' | 'medium' | 'high';
  commandId?: string;
  undoable?: boolean;
  undoExpiresAt?: string;
  brain?: {
    contextSnippets: string[];
    recallMatches?: Array<{ id: string; score: number }>;
    actionProposal?: string;
    recallCount?: number;
    toolTrace?: Array<{ tool: string; input: Record<string, unknown>; output: string; status?: string }>;
    pendingActions?: Array<{
      proposalId: string;
      tool: string;
      summary: string;
      risk: 'low' | 'medium' | 'high';
      requiresApproval: boolean;
      payload: Record<string, unknown>;
      learnedHint?: string;
      approvalId?: string;
      expectedImpact?: string;
      confidence?: number;
      rationale?: string;
    }>;
    autoExecuted?: Array<{ proposalId: string; result: string }>;
    agentRunId?: string;
    transcript?: AgentMessage[];
    workflowRunId?: string;
    error?: string;
    checkpoint?: boolean;
    awaitingApprovalId?: string;
    runStatus?: 'running' | 'completed' | 'failed' | 'awaiting_approval' | 'cancelled';
    plan?: AgentPlan;
    summary?: AgentRunSummary;
    globalKnowledge?: {
      synced: boolean;
      appliedCount: number;
      catalogVersion: string;
      message?: string;
    };
    knowledgeContributionNotice?: string;
    memoryNotice?: string;
    reflectionNotice?: string;
    reflectionStored?: string;
    memoryRecalled?: Array<{ summary: string; age: string; layer: 'short' | 'long'; kind?: string }>;
    specialist?: SpecialistMeta;
    agents?: SpecialistMeta[];
    executionMode?: 'single' | 'sequential' | 'parallel';
    handoffChain?: HandoffChainEntry[];
    agentContributions?: AgentContribution[];
    actionConflicts?: ActionConflict[];
    synthesisSource?: SynthesisSource;
    sharedMemorySummary?: Record<string, unknown>;
    agentTranscripts?: Record<string, AgentMessage[]>;
    explainabilityId?: string;
  };
}

/** Response from GET /api/admin/command/:commandId/agent-run */
export interface AgentRunResponse {
  commandId: string;
  agentRunId: string | null;
  transcript: AgentMessage[];
  status: 'running' | 'completed' | 'failed' | 'unknown' | 'awaiting_approval' | 'cancelled';
  pendingActions: NonNullable<CommandResult['brain']>['pendingActions'];
  checkpoint?: boolean;
  awaitingApprovalId?: string;
}

/** Request body for POST /api/admin/command */
export interface ExecuteCommandRequest {
  command: string;
}

/** Row from GET /api/admin/commands */
export interface CommandHistoryItem {
  id: string;
  command: string;
  result: string;
  intent: string;
  confidence: number;
  createdAt: string;
}

/** Response from POST /api/admin/command/:id/undo */
export interface UndoCommandResponse {
  success: boolean;
  commandId: string;
  message: string;
  intent?: string;
}

export interface ExecuteBrainToolResponse {
  success: boolean;
  message: string;
  proposalId: string;
  tool?: string;
  undoable?: boolean;
  requiresApproval?: boolean;
  error?: string;
}
