import { prisma } from '../../../../../shared/prisma/client';
import type {
  AgentPeerJobPort,
  AgentPeerJobRecord,
  AgentPeerJobStatus,
  EnqueueAgentPeerJobInput,
} from './AgentPeerJobPort';

function mapRow(row: {
  id: string;
  tenantId: string;
  parentRunId: string | null;
  sourceAgentKey: string;
  targetAgentKey: string;
  intent: string;
  query: string;
  status: string;
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
}): AgentPeerJobRecord {
  return {
    ...row,
    status: row.status as AgentPeerJobStatus,
  };
}

export class PrismaAgentPeerJobAdapter implements AgentPeerJobPort {
  async enqueue(input: EnqueueAgentPeerJobInput): Promise<AgentPeerJobRecord> {
    if (input.idempotencyKey) {
      const existing = await prisma.agentPeerJob.findFirst({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) return mapRow(existing);
    }

    const row = await prisma.agentPeerJob.create({
      data: {
        tenantId: input.tenantId,
        parentRunId: input.parentRunId ?? null,
        sourceAgentKey: input.sourceAgentKey,
        targetAgentKey: input.targetAgentKey,
        intent: input.intent,
        query: input.query,
        status: 'pending',
        actorId: input.actorId ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        jobMode: input.jobMode ?? 'handoff',
        messageType: input.messageType ?? null,
        contextPayload: input.contextPayload as import('@prisma/client').Prisma.InputJsonValue,
        resultPayload: JSON.stringify({ meta: { depth: input.depth ?? 1 } }),
      },
    });
    return mapRow(row);
  }

  async claimNext(tenantId?: string): Promise<AgentPeerJobRecord | null> {
    const pending = await prisma.agentPeerJob.findFirst({
      where: {
        status: 'pending',
        ...(tenantId ? { tenantId } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!pending) return null;

    const updated = await prisma.agentPeerJob.updateMany({
      where: { id: pending.id, status: 'pending' },
      data: { status: 'running' },
    });
    if (updated.count === 0) return null;

    const row = await prisma.agentPeerJob.findUnique({ where: { id: pending.id } });
    return row ? mapRow(row) : null;
  }

  async complete(id: string, tenantId: string, resultPayload: Record<string, unknown>): Promise<void> {
    await prisma.agentPeerJob.updateMany({
      where: { id, tenantId },
      data: {
        status: 'completed',
        resultPayload: JSON.stringify(resultPayload),
        completedAt: new Date(),
      },
    });
  }

  async fail(id: string, tenantId: string, error: string): Promise<void> {
    await prisma.agentPeerJob.updateMany({
      where: { id, tenantId },
      data: {
        status: 'failed',
        error,
        completedAt: new Date(),
      },
    });
  }

  async getById(id: string, tenantId: string): Promise<AgentPeerJobRecord | null> {
    const row = await prisma.agentPeerJob.findFirst({ where: { id, tenantId } });
    return row ? mapRow(row) : null;
  }

  async getByParentRunId(tenantId: string, parentRunId: string): Promise<AgentPeerJobRecord[]> {
    const rows = await prisma.agentPeerJob.findMany({
      where: { tenantId, parentRunId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(mapRow);
  }
}
