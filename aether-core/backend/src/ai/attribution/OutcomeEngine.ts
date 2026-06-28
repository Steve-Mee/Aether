import { prisma } from '../../shared/prisma/client';
import { eventBus } from '../../shared/events/eventBus';
import { estimateCausalUplift } from './CausalAttributionService';

export type VerificationStatus = 'proposed' | 'verified' | 'billable';

export async function computeBaseline(
  tenantId: string,
  metric: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  if (metric === 'revenue') {
    const orders = await prisma.order.findMany({
      where: { tenantId, createdAt: { gte: periodStart, lt: periodEnd } },
    });
    return orders.reduce((sum, o) => sum + o.total, 0);
  }
  if (metric === 'support_tickets') {
    const emails = await prisma.emailMessage.count({
      where: { tenantId, createdAt: { gte: periodStart, lt: periodEnd } },
    });
    return emails;
  }
  return 0;
}

export async function recordOutcome(params: {
  tenantId: string;
  metric: string;
  baseline?: number;
  observed: number;
  confidence: number;
  periodStart: Date;
  periodEnd: Date;
  verificationStatus?: VerificationStatus;
  goalId?: string;
  sourceType?: string;
  sourceId?: string;
  rootRunId?: string;
}): Promise<{ uplift: number; id: string }> {
  const baseline =
    params.baseline ??
    (await computeBaseline(params.tenantId, params.metric, params.periodStart, params.periodEnd));

  const causal = await estimateCausalUplift(
    params.tenantId,
    params.metric,
    params.periodStart,
    params.periodEnd
  );

  const uplift = baseline === 0 ? 0 : ((params.observed - baseline) / baseline) * 100;
  const confidence = Math.max(params.confidence, causal.confidence);

  const record = await prisma.outcomeRecord.create({
    data: {
      tenantId: params.tenantId,
      metric: params.metric,
      baseline,
      observed: params.observed,
      uplift,
      confidence,
      verificationStatus: params.verificationStatus ?? 'proposed',
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      goalId: params.goalId ?? null,
      sourceType: params.sourceType ?? null,
      sourceId: params.sourceId ?? null,
      rootRunId: params.rootRunId ?? null,
    },
  });

  await eventBus.publish({
    tenantId: params.tenantId,
    type: 'outcome.recorded',
    payload: { metric: params.metric, uplift, recordId: record.id, baseline },
  });

  return { uplift, id: record.id };
}

/**
 * @deprecated Use verifyOutcomeWithEvidence via POST /api/outcomes/verify instead.
 */
export async function verifyOutcome(
  recordId: string,
  tenantId: string,
  status: VerificationStatus
): Promise<void> {
  const { verifyOutcomeWithEvidence } = await import('../../shared/outcomes/OutcomeVerificationService');
  const result = await verifyOutcomeWithEvidence(recordId, tenantId, status, {
    method: 'manual_review',
    confidence: status === 'billable' ? 0.85 : 0.7,
    actorId: 'legacy_verify_outcome',
    notes: 'Migrated from deprecated verifyOutcome — use /api/outcomes/verify with evidence',
  });
  if (!result.success) {
    throw new Error(result.reason ?? 'Outcome verification failed');
  }
}

export async function getOutcomes(tenantId: string, limit = 20) {
  return prisma.outcomeRecord.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getExplainabilityReport(tenantId: string, periodDays = 30) {
  const since = new Date(Date.now() - periodDays * 86400000);
  const records = await prisma.outcomeRecord.findMany({
    where: { tenantId, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
  });

  const billable = records.filter((r) => r.verificationStatus === 'billable');
  const verified = records.filter((r) => r.verificationStatus === 'verified' || r.verificationStatus === 'billable');

  return {
    periodDays,
    totalRecords: records.length,
    verifiedCount: verified.length,
    billableCount: billable.length,
    totalBillableUplift: billable.reduce((sum, r) => sum + (r.observed - r.baseline), 0),
    records: records.map((r) => ({
      id: r.id,
      metric: r.metric,
      baseline: r.baseline,
      observed: r.observed,
      uplift: r.uplift,
      confidence: r.confidence,
      verificationStatus: r.verificationStatus,
      method: r.confidence >= 0.75 ? 'propensity_score' : 'difference_in_differences',
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
    })),
  };
}

export async function computeIncrementalRevenueUplift(
  tenantId: string,
  periodDays = 30
): Promise<number> {
  const since = new Date(Date.now() - periodDays * 86400000);
  const records = await prisma.outcomeRecord.findMany({
    where: {
      tenantId,
      metric: 'revenue',
      verificationStatus: { in: ['verified', 'billable'] },
      createdAt: { gte: since },
    },
  });
  if (records.length === 0) return 0;
  return records.reduce((sum, r) => sum + (r.observed - r.baseline), 0);
}
