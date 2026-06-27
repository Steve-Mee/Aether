export type ToolRisk = 'low' | 'medium' | 'high';
export type ToolExecutionKind = 'read' | 'propose';

export interface BrainToolParameterDef {
  type: string;
  required?: boolean;
  description: string;
}

export interface BrainToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, BrainToolParameterDef>;
  risk: ToolRisk;
  kind: ToolExecutionKind;
  module: string;
}

export interface BrainToolContext {
  tenantId: string;
  agentKey?: string;
  allowedTools?: string[];
  actorId?: string;
  commandId?: string;
  originalCommand?: string;
  parentRunId?: string;
  onEvent?: import('../../command-brain/AgentStreamEvents').AgentStreamCallback;
  peerDepth?: number;
}

export interface BrainToolCall {
  tool: string;
  input: Record<string, unknown>;
}

export interface BrainToolTraceEntry {
  tool: string;
  input: Record<string, unknown>;
  output: string;
  status?: 'ok' | 'error' | 'proposed';
}

export interface ToolProposalDraft {
  tool: string;
  summary: string;
  risk: ToolRisk;
  requiresApproval: boolean;
  payload: Record<string, unknown>;
  expectedImpact?: string;
  confidence?: number;
  rationale?: string;
}

export interface ToolProposal extends ToolProposalDraft {
  proposalId: string;
  learnedHint?: string;
  approvalId?: string;
}

export interface ToolExecutionResult {
  success: boolean;
  result: string;
  undoable?: boolean;
  operationalMeta?: Record<string, unknown>;
  error?: string;
}

export interface BrainToolExecutor {
  definition: BrainToolDefinition;
  validate(input: Record<string, unknown>): { ok: true } | { ok: false; error: string };
  executeRead(ctx: BrainToolContext, input: Record<string, unknown>): Promise<unknown>;
  buildProposal?(
    ctx: BrainToolContext,
    input: Record<string, unknown>
  ): Promise<ToolProposalDraft>;
  executeConfirmed?(
    ctx: BrainToolContext,
    payload: Record<string, unknown>
  ): Promise<ToolExecutionResult>;
}

export interface PersonalBrainToolRegistryDeps {
  adminData: import('../../../../modules/admin-command-bar/application/ports/AdminDataPort').AdminDataPort;
  personalBrains: import('../PersonalBrainRegistry').PersonalBrainRegistry;
  globalBrain?: import('../../global-brain/GlobalBrainPort').GlobalBrainPort;
  supplierMonitor?: import('../../../../modules/admin-command-bar/application/ports/SupplierMonitorPort').SupplierMonitorPort;
  submitInsight?: import('../../../../modules/zero-knowledge-hive-mind/application/use-cases/SubmitInsightUseCase').SubmitInsightUseCase;
  ktGate?: import('../../knowledge-transfer/KnowledgeTransferGatePort').KnowledgeTransferGatePort;
}
