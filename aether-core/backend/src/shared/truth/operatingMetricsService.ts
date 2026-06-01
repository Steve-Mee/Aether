import { prisma } from '../prisma/client';
import { loadFeatureStatusDocument, FeatureEntry } from './featureStatusRegistry';
import { computeGatePassRate } from '../security/gateAuditService';
import { applyKillFastPolicy } from '../features/killFastPolicy';

export interface OperatingMetrics {
  tenantSafetyScore: number;
  gatePassRate: number;
  autonomyRate: number;
  autonomyIncidentRate: number;
  causalUpliftVerified: number;
  rollbackSuccessRate: number;
  killFastCandidates: string[];
  killFastDisabled: string[];
  truthReviewDue: boolean;
  lastTruthReviewAt: string | null;
  pendingApprovalBacklog: number;
  eventOutboxLag: number;
}

export async function getOperatingMetrics(tenantId: string): Promise<OperatingMetrics> {
  const since30d = new Date(Date.now() - 30 * 86400000);

  const [approvals, rollbacks, outcomes, decisions, auditViolations, gatePassRate, killFastDisabled, pendingApprovalBacklog, eventOutboxLag] =
    await Promise.all([
      prisma.approval.findMany({ where: { tenantId, createdAt: { gte: since30d } } }),
      prisma.auditLog.findMany({
        where: {
          tenantId,
          action: { in: ['proposal_rollback', 'email_rollback'] },
          createdAt: { gte: since30d },
        },
      }),
      prisma.outcomeRecord.findMany({
        where: { tenantId, verificationStatus: 'billable', createdAt: { gte: since30d } },
      }),
      prisma.decision.findMany({ where: { tenantId, createdAt: { gte: since30d } } }),
      prisma.auditLog.count({
        where: { tenantId, action: 'tenant_access_denied', createdAt: { gte: since30d } },
      }),
      computeGatePassRate(tenantId, 30),
      applyKillFastPolicy(tenantId),
      prisma.approval.count({ where: { tenantId, status: 'pending' } }),
      prisma.domainEvent.count({ where: { processedAt: null } }),
    ]);

  const rollbackAttempts = rollbacks.length;
  const rollbackSuccess = rollbacks.filter((r) => {
    let details: Record<string, unknown> | null = null;
    if (typeof r.details === 'string') {
      try {
        details = JSON.parse(r.details) as Record<string, unknown>;
      } catch {
        details = null;
      }
    }
    return details?.success !== false;
  }).length;

  const humanGated = approvals.filter((a) => a.status === 'pending' || a.status === 'approved').length;
  const autonomous = decisions.length;
  const total = autonomous + humanGated;
  const autonomyRate = total === 0 ? 0 : autonomous / total;
  const incidentRate = total === 0 ? 0 : approvals.filter((a) => a.status === 'rejected').length / total;

  const causalUpliftVerified = outcomes.reduce((sum, o) => sum + Math.max(0, o.observed - o.baseline), 0);

  const doc = loadFeatureStatusDocument();
  const killFastCandidates = Object.entries(doc.features)
    .filter(([, entry]: [string, FeatureEntry]) => entry.status === 'experimental' || entry.status === 'scaffold')
    .map(([key, entry]: [string, FeatureEntry]) => `${key}:${entry.status}`);

  const lastReview = await prisma.auditLog.findFirst({
    where: { tenantId, action: 'truth_review_completed' },
    orderBy: { createdAt: 'desc' },
  });

  const daysSinceReview = lastReview
    ? (Date.now() - lastReview.createdAt.getTime()) / 86400000
    : Infinity;

  return {
    tenantSafetyScore: auditViolations === 0 ? 1 : Math.max(0, 1 - auditViolations / 100),
    gatePassRate,
    autonomyRate,
    autonomyIncidentRate: incidentRate,
    causalUpliftVerified,
    rollbackSuccessRate: rollbackAttempts === 0 ? 1 : rollbackSuccess / rollbackAttempts,
    killFastCandidates,
    killFastDisabled,
    truthReviewDue: daysSinceReview >= 7,
    lastTruthReviewAt: lastReview?.createdAt.toISOString() ?? null,
    pendingApprovalBacklog,
    eventOutboxLag,
  };
}
