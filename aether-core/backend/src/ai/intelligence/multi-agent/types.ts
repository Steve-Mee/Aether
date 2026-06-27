export type AgentKey = 'admin' | 'mail' | 'supplier' | 'pricing' | 'inventory' | string;

export type RouteSource = 'intent' | 'keyword' | 'llm' | 'llm-plan' | 'none';
export type ExecutionMode = 'single' | 'sequential' | 'parallel';

export type PlanAgent = { agentKey: string; intent: string; command?: string };

export type PlanNode =
  | { kind: 'agent'; agentKey: string; intent: string; command?: string }
  | { kind: 'group'; mode: 'sequential' | 'parallel'; children: PlanNode[] }
  | { kind: 'supervisor'; agentKey: string; intent: string; command?: string; subPlan?: PlanNode };

export interface CollaborationChainStep {
  agentKey: string;
  intent: string;
  command?: string;
}

export interface CollaborationChain {
  ruleId: string;
  mode: 'prepend' | 'sequential' | 'parallel';
  steps: CollaborationChainStep[];
  primaryAgentKey?: string;
}

export interface RouteDecision {
  agent: SpecialistAgentDefinition | null;
  agentKey: AgentKey | null;
  confidence: number;
  reason: string;
  source: RouteSource;
}

export interface SpecialistMeta {
  agentKey: string;
  delegatedFrom: string;
  specialistRunId?: string;
  handoffSummary?: string;
  routingSource?: RouteSource;
}

export interface ParallelSpecialistRequest {
  tenantId: string;
  command: string;
  agents: Array<{ agentKey: string; intent: string; contextSnippets?: string[] }>;
  parentRunId?: string;
  actorId?: string;
  collectiveSnippets?: string[];
  memoryPromptBlock?: string;
  deferToTools?: boolean;
  adaptiveLearningEnabled?: boolean;
  onEvent?: import('../command-brain/AgentStreamEvents').AgentStreamCallback;
  abortSignal?: AbortSignal;
}

export interface AgentBranchResult extends SpecialistExecuteResult {
  agentKey: string;
  status: 'completed' | 'failed' | 'skipped';
}

export interface AgentContribution {
  agentKey: string;
  summary: string;
  status: 'completed' | 'failed';
  pendingActions?: import('../personal-brain/tools/types').ToolProposal[];
}

export interface ActionConflict {
  description: string;
  proposals: import('../personal-brain/tools/types').ToolProposal[];
  resolution: 'user_choice' | 'merged';
}

export type SynthesisSource = 'llm' | 'structured' | 'concat';

export interface AggregatedMultiAgentResult {
  narrative: string;
  perAgentContributions: AgentContribution[];
  conflicts?: ActionConflict[];
  synthesisSource: SynthesisSource;
}

export interface ParallelSpecialistResult {
  results: AgentBranchResult[];
  mergedNarrative: string;
  mergedToolTrace: import('../personal-brain/tools/types').BrainToolTraceEntry[];
  pendingActions: import('../personal-brain/tools/types').ToolProposal[];
  agentRunIds: string[];
  checkpoint?: boolean;
}

export interface ExecutionPlan {
  mode: ExecutionMode;
  agents: PlanAgent[];
  root?: PlanNode;
  planDepth?: number;
  collaborationChain?: CollaborationChain;
  routingSource?: RouteSource;
  routingReason?: string;
  performanceScores?: Record<string, number>;
  graphDefinition?: import('./graph/types').GraphDefinition;
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
}

export interface SpecialistAgentDefinition {
  agentKey: AgentKey;
  displayName: string;
  rolePrompt: string;
  supportedIntents: string[];
  allowedTools: string[];
  memoryNamespace: string;
  canDelegateTo?: AgentKey[];
  keywordPatterns?: RegExp[];
}

export interface SpecialistExecuteRequest {
  tenantId: string;
  agentKey: AgentKey;
  intent: string;
  command: string;
  contextSnippets: string[];
  handlerResult: string;
  parameters?: Record<string, unknown>;
  parentRunId?: string;
  actorId?: string;
  collectiveSnippets?: string[];
  memoryPromptBlock?: string;
  deferToTools?: boolean;
  adaptiveLearningEnabled?: boolean;
  commandId?: string;
  onEvent?: import('../command-brain/AgentStreamEvents').AgentStreamCallback;
  abortSignal?: AbortSignal;
  handoffConstraints?: string[];
  chainContext?: string[];
  skipCollaborationChain?: boolean;
  peerDepth?: number;
}

export interface PeerDelegationRequest {
  tenantId: string;
  sourceAgentKey: string;
  targetAgentKey: string;
  intent: string;
  query: string;
  parentRunId?: string;
  actorId?: string;
  depth: number;
  onEvent?: import('../command-brain/AgentStreamEvents').AgentStreamCallback;
  abortSignal?: AbortSignal;
}

export interface PeerDelegationResult {
  success: boolean;
  narrative?: string;
  error?: string;
  agentRunId?: string;
}

export interface SpecialistExecuteResult {
  narrative: string;
  actionProposal?: string;
  error?: string;
  toolTrace?: import('../personal-brain/tools/types').BrainToolTraceEntry[];
  pendingActions?: import('../personal-brain/tools/types').ToolProposal[];
  agentRunId?: string;
  checkpoint?: boolean;
  awaitingApprovalId?: string;
  runStatus?: 'running' | 'completed' | 'failed' | 'awaiting_approval' | 'cancelled';
  plan?: import('../command-brain/types/AgentPlan').AgentPlan;
  summary?: import('../command-brain/types/AgentPlan').AgentRunSummary;
  handoffPackage?: HandoffPackage;
  transcript?: import('../command-brain/AgentTranscript').AgentMessage[];
}

export interface ResumeToken {
  token: string;
  parentRunId: string;
  delegationId: string;
  createdAt: string;
}

export interface HandoffPackage {
  sourceAgentKey: AgentKey;
  targetAgentKey: AgentKey;
  reflectionIds: string[];
  summary: string;
  constraints?: string[];
  delegationId?: string;
  resumeToken?: ResumeToken;
}

export interface DelegationRequest {
  tenantId: string;
  targetAgentKey: AgentKey;
  intent: string;
  command: string;
  context: string[];
  parentRunId: string;
  resumeToken?: ResumeToken;
  delegationId?: string;
}

export interface DelegationResult {
  childRunId: string;
  delegationId: string;
  status: 'running' | 'completed' | 'failed';
  agentKey: AgentKey;
}

export interface DelegationMeta {
  reason: string;
  handoffPackageId?: string;
  resumeToken?: string;
  childSummary?: string;
  reflectionIds?: string[];
}

export interface DelegationRecord {
  id: string;
  tenantId: string;
  parentRunId: string;
  childRunId: string;
  delegationId: string;
  sourceAgentKey: AgentKey;
  targetAgentKey: AgentKey;
  status: string;
  createdAt: string;
}

export interface ResumeFromChildInput {
  tenantId: string;
  parentRunId: string;
  childRunId: string;
  handoffPackage: HandoffPackage;
}

export interface ResumeFromChildResult {
  resumed: boolean;
  contextBlock: string;
}
