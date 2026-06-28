import { prisma } from '../../../../shared/prisma/client';

export interface ContributionLogEntry {
  id: string;
  source: string;
  category: string;
  metric: string;
  sampleSize: number;
  submitted: boolean;
  rejectReason: string | null;
  createdAt: string;
}

export interface ContributionSummary {
  submitted30d: number;
  rejected30d: number;
  lastContributionAt: string | null;
  federatedOptIn: boolean;
}

export class ContributionHistoryService {
  async getHistory(
    tenantId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ entries: ContributionLogEntry[]; total: number }> {
    const limit = Math.min(options?.limit ?? 50, 100);
    const offset = options?.offset ?? 0;

    const [rows, total] = await Promise.all([
      prisma.brainKnowledgeContributionLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.brainKnowledgeContributionLog.count({ where: { tenantId } }),
    ]);

    return {
      total,
      entries: rows.map((r) => ({
        id: r.id,
        source: r.source,
        category: r.category,
        metric: r.metric,
        sampleSize: r.sampleSize,
        submitted: r.submitted,
        rejectReason: r.rejectReason,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async getSummary(tenantId: string): Promise<ContributionSummary> {
    const since = new Date(Date.now() - 30 * 86400000);
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { brainFederatedContributionEnabled: true },
    });

    const [submitted30d, rejected30d, lastRow] = await Promise.all([
      prisma.brainKnowledgeContributionLog.count({
        where: { tenantId, submitted: true, createdAt: { gte: since } },
      }),
      prisma.brainKnowledgeContributionLog.count({
        where: { tenantId, submitted: false, createdAt: { gte: since } },
      }),
      prisma.brainKnowledgeContributionLog.findFirst({
        where: { tenantId, submitted: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      submitted30d,
      rejected30d,
      lastContributionAt: lastRow?.createdAt.toISOString() ?? null,
      federatedOptIn: settings?.brainFederatedContributionEnabled === true,
    };
  }
}
