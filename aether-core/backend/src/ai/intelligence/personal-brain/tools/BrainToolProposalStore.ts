import { prisma } from '../../../../shared/prisma/client';
import { createApproval } from '../../../../shared/approval/approvalService';
import { writeAuditLog } from '../../../../shared/audit/auditService';
import type { ToolProposal, ToolRisk } from './types';

const DEFAULT_TTL_MINUTES = Number(process.env.BRAIN_TOOL_PROPOSAL_TTL_MINUTES ?? 15);

export function proposalTtlMinutes(): number {
  return Number.isFinite(DEFAULT_TTL_MINUTES) && DEFAULT_TTL_MINUTES > 0 ? DEFAULT_TTL_MINUTES : 15;
}

export async function createBrainToolProposal(params: {
  tenantId: string;
  tool: string;
  summary: string;
  risk: ToolRisk;
  payload: Record<string, unknown>;
  commandId?: string;
  actorId?: string;
  requiresInbox?: boolean;
  expectedImpact?: string;
  confidence?: number;
  rationale?: string;
  learnedHint?: string;
  ktSnippets?: string[];
}): Promise<ToolProposal> {
  const expiresAt = new Date(Date.now() + proposalTtlMinutes() * 60_000);
  const needsInbox =
    params.requiresInbox ??
    (params.risk === 'high' || params.risk === 'medium');

  const row = await prisma.brainToolProposal.create({
    data: {
      tenantId: params.tenantId,
      commandId: params.commandId ?? null,
      tool: params.tool,
      summary: params.summary,
      risk: params.risk,
      payload: JSON.stringify(params.payload),
      status: 'pending',
      expiresAt,
    },
  });

  let approvalId: string | undefined;
  if (needsInbox) {
    const approval = await createApproval({
      tenantId: params.tenantId,
      module: 'admin-command-bar',
      actionType: `brain.${params.tool}`,
      payload: {
        proposalId: row.id,
        tool: params.tool,
        summary: params.summary,
        risk: params.risk,
        confidence: params.confidence,
        expectedImpact: params.expectedImpact,
        rationale: params.rationale,
        learnedHint: params.learnedHint,
        ktSnippets: params.ktSnippets,
        commandId: params.commandId,
        source: 'personal-brain',
      },
      requestedBy: params.actorId,
    });
    approvalId = approval.id;
    await prisma.brainToolProposal.update({
      where: { id: row.id },
      data: { approvalId },
    });

    await writeAuditLog({
      tenantId: params.tenantId,
      module: 'admin-command-bar',
      action: 'brain_approval_created',
      actor: params.actorId,
      details: {
        approvalId,
        proposalId: row.id,
        tool: params.tool,
        risk: params.risk,
        commandId: params.commandId,
      },
    });
  }

  return {
    proposalId: row.id,
    tool: row.tool,
    summary: row.summary,
    risk: row.risk as ToolRisk,
    requiresApproval: needsInbox || row.risk === 'high' || row.risk === 'medium',
    payload: params.payload,
    approvalId,
    expectedImpact: params.expectedImpact,
    confidence: params.confidence,
    rationale: params.rationale,
  };
}

export async function linkProposalsToCommand(proposalIds: string[], commandId: string): Promise<void> {
  if (proposalIds.length === 0) return;
  await prisma.brainToolProposal.updateMany({
    where: { id: { in: proposalIds }, status: 'pending' },
    data: { commandId },
  });
}

export async function getBrainToolProposal(id: string, tenantId: string) {
  return prisma.brainToolProposal.findFirst({
    where: { id, tenantId },
  });
}

export async function markProposalStatus(
  id: string,
  tenantId: string,
  status: 'executed' | 'rejected' | 'expired',
  executionResult?: string
): Promise<void> {
  const existing = await prisma.brainToolProposal.findFirst({
    where: { id, tenantId, status: 'pending' },
  });
  if (!existing) return;

  let payload = existing.payload;
  if (executionResult && status === 'executed') {
    try {
      const parsed = JSON.parse(existing.payload) as Record<string, unknown>;
      parsed._executionResult = executionResult;
      payload = JSON.stringify(parsed);
    } catch {
      payload = JSON.stringify({ _executionResult: executionResult });
    }
  }

  await prisma.brainToolProposal.updateMany({
    where: { id, tenantId, status: 'pending' },
    data: { status, payload },
  });
}

export function getProposalExecutionResult(proposal: {
  payload: string;
  status: string;
}): string | null {
  if (proposal.status !== 'executed') return null;
  try {
    const parsed = JSON.parse(proposal.payload) as Record<string, unknown>;
    return typeof parsed._executionResult === 'string' ? parsed._executionResult : null;
  } catch {
    return null;
  }
}
