export type AgentKey = 'admin' | 'mail' | 'supplier' | 'pricing' | 'inventory' | string;

export type RouteSource = 'intent' | 'keyword' | 'llm' | 'none';
export type ExecutionMode = 'single' | 'sequential' | 'parallel';

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
}

export interface ParallelSpecialistResult {
  results: SpecialistExecuteResult[];
  mergedNarrative: string;
  mergedToolTrace: import('../personal-brain/tools/types').BrainToolTraceEntry[];
  pendingActions: import('../personal-brain/tools/types').ToolProposal[];
  agentRunIds: string[];
  checkpoint?: boolean;
}

export interface ExecutionPlan {
  mode: ExecutionMode;
  agents: Array<{ agentKey: string; intent: string; command?: string }>;
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
