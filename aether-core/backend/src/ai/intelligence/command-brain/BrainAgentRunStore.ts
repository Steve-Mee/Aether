import { prisma } from '../../../shared/prisma/client';
import type { Prisma } from '@prisma/client';
import type { AgentMessage } from './AgentTranscript';

export type BrainAgentRunStatus =
  | 'running'
  | 'completed'
  | 'failed'
  | 'awaiting_approval'
  | 'cancelled';

export interface AgentRunResumeContext {
  command: string;
  handlerResult: string;
  parsedIntent: string;
  contextSnippets: string[];
  collectiveSnippets?: string[];
  deferToTools?: boolean;
  adaptiveLearningEnabled?: boolean;
  actorId?: string;
  commandId?: string;
  memoryPromptBlock?: string;
}

export async function createBrainAgentRun(params: {
  tenantId: string;
  commandId?: string;
  transcript: AgentMessage[];
  resumeContext?: AgentRunResumeContext;
  agentKey?: string;
  parentRunId?: string;
  delegationId?: string;
  delegationMeta?: Prisma.InputJsonValue;
}): Promise<{ id: string }> {
  const row = await prisma.brainAgentRun.create({
    data: {
      tenantId: params.tenantId,
      commandId: params.commandId ?? null,
      transcript: JSON.stringify(params.transcript),
      status: 'running',
      resumeContext: params.resumeContext ? JSON.stringify(params.resumeContext) : null,
      agentKey: params.agentKey ?? 'admin',
      parentRunId: params.parentRunId ?? null,
      delegationId: params.delegationId ?? null,
      delegationMeta: params.delegationMeta ?? undefined,
    },
  });
  return { id: row.id };
}

export async function updateBrainAgentRun(params: {
  id: string;
  tenantId: string;
  transcript: AgentMessage[];
  status: BrainAgentRunStatus;
  commandId?: string;
  currentStep?: number;
  totalSteps?: number;
}): Promise<void> {
  await prisma.brainAgentRun.updateMany({
    where: { id: params.id, tenantId: params.tenantId },
    data: {
      transcript: JSON.stringify(params.transcript),
      status: params.status,
      ...(params.commandId ? { commandId: params.commandId } : {}),
      ...(params.currentStep != null ? { currentStep: params.currentStep } : {}),
      ...(params.totalSteps != null ? { totalSteps: params.totalSteps } : {}),
      ...(params.status !== 'awaiting_approval'
        ? { pendingApprovalId: null, pendingProposalId: null }
        : {}),
    },
  });
}

export async function updateBrainAgentRunCheckpoint(params: {
  id: string;
  tenantId: string;
  transcript: AgentMessage[];
  currentStep: number;
  totalSteps: number;
  pendingApprovalId: string;
  pendingProposalId: string;
}): Promise<void> {
  await prisma.brainAgentRun.updateMany({
    where: { id: params.id, tenantId: params.tenantId },
    data: {
      transcript: JSON.stringify(params.transcript),
      status: 'awaiting_approval',
      currentStep: params.currentStep,
      totalSteps: params.totalSteps,
      pendingApprovalId: params.pendingApprovalId,
      pendingProposalId: params.pendingProposalId,
    },
  });
}

export async function updateBrainAgentRunCommandId(
  id: string,
  tenantId: string,
  commandId: string
): Promise<void> {
  await prisma.brainAgentRun.updateMany({
    where: { id, tenantId },
    data: { commandId },
  });
}

export async function getBrainAgentRunByCommandId(commandId: string, tenantId: string) {
  return prisma.brainAgentRun.findFirst({
    where: { commandId, tenantId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getBrainAgentRunById(id: string, tenantId: string) {
  return prisma.brainAgentRun.findFirst({
    where: { id, tenantId },
  });
}

export async function getBrainAgentRunByApprovalId(approvalId: string, tenantId: string) {
  return prisma.brainAgentRun.findFirst({
    where: { pendingApprovalId: approvalId, tenantId, status: 'awaiting_approval' },
    orderBy: { createdAt: 'desc' },
  });
}

export async function listPendingProposalsForCommand(commandId: string, tenantId: string) {
  return prisma.brainToolProposal.findMany({
    where: { commandId, tenantId, status: 'pending', expiresAt: { gt: new Date() } },
  });
}

export function parseResumeContext(raw: string | null): AgentRunResumeContext | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AgentRunResumeContext;
  } catch {
    return null;
  }
}

export async function cancelBrainAgentRun(id: string, tenantId: string): Promise<boolean> {
  const result = await prisma.brainAgentRun.updateMany({
    where: {
      id,
      tenantId,
      status: { in: ['running', 'awaiting_approval'] },
    },
    data: {
      status: 'cancelled',
      pendingApprovalId: null,
      pendingProposalId: null,
    },
  });
  return result.count > 0;
}

export async function cancelBrainAgentRunByCommandId(
  commandId: string,
  tenantId: string
): Promise<{ cancelled: boolean; agentRunId?: string }> {
  const run = await getBrainAgentRunByCommandId(commandId, tenantId);
  if (!run) return { cancelled: false };
  const cancelled = await cancelBrainAgentRun(run.id, tenantId);
  return { cancelled, agentRunId: run.id };
}

export async function listChildBrainAgentRuns(tenantId: string, parentRunId: string) {
  return prisma.brainAgentRun.findMany({
    where: { tenantId, parentRunId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function updateBrainAgentRunDelegation(params: {
  id: string;
  tenantId: string;
  delegationMeta?: Prisma.InputJsonValue;
  status?: BrainAgentRunStatus;
}): Promise<void> {
  await prisma.brainAgentRun.updateMany({
    where: { id: params.id, tenantId: params.tenantId },
    data: {
      ...(params.delegationMeta ? { delegationMeta: params.delegationMeta } : {}),
      ...(params.status ? { status: params.status } : {}),
    },
  });
}

export async function listBrainAgentRunsForTimeline(
  tenantId: string,
  options?: { from?: Date; to?: Date; agentKey?: string; limit?: number }
) {
  return prisma.brainAgentRun.findMany({
    where: {
      tenantId,
      ...(options?.agentKey ? { agentKey: options.agentKey } : {}),
      ...(options?.from || options?.to
        ? {
            createdAt: {
              ...(options.from ? { gte: options.from } : {}),
              ...(options.to ? { lte: options.to } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 100,
  });
}
