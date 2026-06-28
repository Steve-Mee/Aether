export type AgentPeerJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface EnqueueAgentPeerJobInput {
  tenantId: string;
  parentRunId?: string;
  sourceAgentKey: string;
  targetAgentKey: string;
  intent: string;
  query: string;
  actorId?: string;
  idempotencyKey?: string;
  depth?: number;
  jobMode?: 'handoff' | 'notify';
  messageType?: string;
  contextPayload?: Record<string, unknown>;
}

export interface AgentPeerJobRecord {
  id: string;
  tenantId: string;
  parentRunId: string | null;
  sourceAgentKey: string;
  targetAgentKey: string;
  intent: string;
  query: string;
  status: AgentPeerJobStatus;
  resultPayload: string | null;
  error: string | null;
  idempotencyKey: string | null;
  actorId: string | null;
  jobMode: string | null;
  messageType: string | null;
  contextPayload: unknown;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface AgentPeerJobPort {
  enqueue(input: EnqueueAgentPeerJobInput): Promise<AgentPeerJobRecord>;
  claimNext(tenantId?: string): Promise<AgentPeerJobRecord | null>;
  complete(id: string, tenantId: string, resultPayload: Record<string, unknown>): Promise<void>;
  fail(id: string, tenantId: string, error: string): Promise<void>;
  getById(id: string, tenantId: string): Promise<AgentPeerJobRecord | null>;
  getByParentRunId(tenantId: string, parentRunId: string): Promise<AgentPeerJobRecord[]>;
}
