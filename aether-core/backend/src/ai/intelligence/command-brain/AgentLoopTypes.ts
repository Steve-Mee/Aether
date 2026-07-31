import type { GenerateResponseInput, GenerateResponseOutput } from './BrainResponseService';
import type { BrainToolTraceEntry, ToolProposal } from '../personal-brain/tools/types';
import type { AgentTranscript } from './AgentTranscript';
import type { AgentStreamCallback } from './AgentStreamEvents';
import type { CompoundStep } from '../agent-runtime/types';
import type { ExplainabilityCollector } from '../explainability/ExplainabilityCollector';
import type { AgentPlan, AgentRunSummary } from './types/AgentPlan';

export interface AgentLoopOutput extends GenerateResponseOutput {
  toolTrace?: BrainToolTraceEntry[];
  pendingActions?: ToolProposal[];
  autoExecuted?: Array<{ proposalId: string; result: string }>;
  agentRunId?: string;
  transcript?: ReturnType<AgentTranscript['getMessages']>;
  checkpoint?: boolean;
  awaitingApprovalId?: string;
  runStatus?: 'running' | 'completed' | 'failed' | 'awaiting_approval' | 'cancelled';
  plan?: AgentPlan;
  summary?: AgentRunSummary;
}

export interface AgentLoopRunInput extends GenerateResponseInput {
  tenantId: string;
  deferToTools?: boolean;
  adaptiveLearningEnabled?: boolean;
  actorId?: string;
  collectiveSnippets?: string[];
  onEvent?: AgentStreamCallback;
  commandId?: string;
  persistRun?: boolean;
  abortSignal?: AbortSignal;
  subGoals?: CompoundStep[];
  agentKey?: string;
  rolePrompt?: string;
  allowedTools?: string[];
  parentRunId?: string;
  handoffConstraints?: string[];
  peerDepth?: number;
  correlationId?: string;
  resumeState?: {
    agentRunId: string;
    startStep: number;
    totalSteps: number;
    transcript: ReturnType<AgentTranscript['getMessages']>;
  };
  explainabilityCollector?: ExplainabilityCollector;
}
