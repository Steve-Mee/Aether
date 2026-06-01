import type { EmailAnalyticsPort } from '../ports/EmailAnalyticsPort';

export interface EmailMetrics {
  totalProcessed: number;
  classifiedCount: number;
  classificationRate: number;
  escalatedCount: number;
  escalationRate: number;
  autoRepliedCount: number;
  pilotProcessedCount: number;
  autoReplyRate: number;
  rollbackCount: number;
  rollbackRate: number;
  classificationSource: {
    ollama: number;
    heuristic: number;
  };
  targetsMet: {
    classificationAbove60Pct: boolean;
    escalationBelow15Pct: boolean;
    autoReplyAbove70Pct: boolean;
  };
}

export async function getEmailMetrics(
  tenantId: string,
  periodDays: number,
  analytics: EmailAnalyticsPort
): Promise<EmailMetrics> {
  const since = new Date(Date.now() - periodDays * 86400000);
  const [emails, auditLogs, rollbacks] = await Promise.all([
    analytics.listEmailsSince(tenantId, since),
    analytics.listProcessedAuditLogsSince(tenantId, since),
    analytics.countRollbackAuditLogsSince(tenantId, since),
  ]);

  const totalProcessed = emails.length;
  const classifiedCount = emails.filter((e) => e.category != null).length;
  const escalatedCount = emails.filter((e) => e.status === 'escalated').length;
  const autoRepliedCount = emails.filter((e) => e.status === 'replied').length;

  let ollamaCount = 0;
  let heuristicCount = 0;
  for (const log of auditLogs) {
    let details: { classification?: { source?: string } } | null = null;
    if (typeof log.details === 'string') {
      try {
        details = JSON.parse(log.details);
      } catch {
        details = null;
      }
    }
    if (details?.classification?.source === 'heuristic') heuristicCount += 1;
    else if (details?.classification?.source === 'ollama') ollamaCount += 1;
  }

  const classificationRate = totalProcessed === 0 ? 0 : classifiedCount / totalProcessed;
  const escalationRate = totalProcessed === 0 ? 0 : escalatedCount / totalProcessed;
  const pilotProcessedCount = autoRepliedCount + escalatedCount;
  const autoReplyRate =
    pilotProcessedCount === 0 ? 0 : autoRepliedCount / pilotProcessedCount;
  const rollbackRate = totalProcessed === 0 ? 0 : rollbacks / totalProcessed;

  return {
    totalProcessed,
    classifiedCount,
    classificationRate,
    escalatedCount,
    escalationRate,
    autoRepliedCount,
    pilotProcessedCount,
    autoReplyRate,
    rollbackCount: rollbacks,
    rollbackRate,
    classificationSource: { ollama: ollamaCount, heuristic: heuristicCount },
    targetsMet: {
      classificationAbove60Pct: classificationRate >= 0.6,
      escalationBelow15Pct: escalationRate < 0.15,
      autoReplyAbove70Pct: autoReplyRate >= 0.7 && pilotProcessedCount >= 100,
    },
  };
}
