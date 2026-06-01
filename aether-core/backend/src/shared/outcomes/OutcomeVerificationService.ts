import { prisma } from '../prisma/client';
import { writeAuditLog } from '../audit/auditService';
import { estimateCausalUplift } from '../../ai/attribution/CausalAttributionService';
import { eventBus } from '../events/eventBus';
import type { VerificationStatus } from '../../ai/attribution/OutcomeEngine';

/** Sources that must never auto-create billable revenue outcomes */
export const BLOCKED_OUTCOME_SOURCES = new Set([
  'admin.price_update',
  'admin.command',
  'command.executed',
]);

export interface OutcomeEvidence {
  method: 'causal_uplift' | 'holdout_experiment' | 'manual_review';
  confidence: number;
  notes?: string;
  actorId?: string;
}

const MIN_BILLABLE_CONFIDENCE = 0.75;
const MIN_VERIFY_CONFIDENCE = 0.6;

export function isBlockedOutcomeSource(source: string): boolean {
  return BLOCKED_OUTCOME_SOURCES.has(source);
}

export async function verifyOutcomeWithEvidence(
  recordId: string,
  tenantId: string,
  targetStatus: VerificationStatus,
  evidence: OutcomeEvidence
): Promise<{ success: boolean; reason?: string }> {
  const record = await prisma.outcomeRecord.findFirst({
    where: { id: recordId, tenantId },
  });

  if (!record) {
    return { success: false, reason: 'Outcome record not found' };
  }

  if (targetStatus === 'billable') {
    if (record.verificationStatus !== 'verified') {
      return { success: false, reason: 'Outcome must be verified before billable' };
    }
    if (evidence.confidence < MIN_BILLABLE_CONFIDENCE) {
      return { success: false, reason: `Billable requires confidence ≥ ${MIN_BILLABLE_CONFIDENCE}` };
    }
    if (evidence.method === 'manual_review' && !evidence.actorId) {
      return { success: false, reason: 'Manual billable review requires actorId' };
    }
  } else if (targetStatus === 'verified') {
    if (evidence.confidence < MIN_VERIFY_CONFIDENCE) {
      return { success: false, reason: `Verify requires confidence ≥ ${MIN_VERIFY_CONFIDENCE}` };
    }

    const causal = await estimateCausalUplift(
      tenantId,
      record.metric,
      record.periodStart,
      record.periodEnd
    );

    if (causal.confidence < MIN_VERIFY_CONFIDENCE && evidence.method !== 'manual_review') {
      return {
        success: false,
        reason: `Causal uplift confidence ${causal.confidence.toFixed(2)} below threshold ${MIN_VERIFY_CONFIDENCE}`,
      };
    }
  }

  await prisma.outcomeRecord.updateMany({
    where: { id: recordId, tenantId },
    data: { verificationStatus: targetStatus },
  });

  await writeAuditLog({
    tenantId,
    module: 'outcomes',
    action: 'outcome_verified_with_evidence',
    actor: evidence.actorId,
    details: { recordId, targetStatus, evidence },
  });

  await eventBus.publish({
    tenantId,
    type: 'outcome.verified',
    payload: { recordId, status: targetStatus, evidence: evidence.method },
    idempotencyKey: `outcome.verified:${recordId}:${targetStatus}`,
  });

  return { success: true };
}

export async function recordOperationalOutcome(params: {
  tenantId: string;
  metric: string;
  observed: number;
  confidence: number;
  periodStart: Date;
  periodEnd: Date;
  source: string;
}): Promise<{ id: string } | { blocked: true; reason: string }> {
  if (isBlockedOutcomeSource(params.source)) {
    return {
      blocked: true,
      reason: `Source '${params.source}' cannot create revenue outcomes — use independent verification path`,
    };
  }

  const { recordOutcome } = await import('../../ai/attribution/OutcomeEngine');
  const result = await recordOutcome({
    tenantId: params.tenantId,
    metric: params.metric,
    observed: params.observed,
    confidence: params.confidence,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    verificationStatus: 'proposed',
  });

  return { id: result.id };
}
