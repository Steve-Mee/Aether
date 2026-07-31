import { prisma } from '../../../../shared/prisma/client';
import type { HandoffOverviewPort } from '../../application/ports/HandoffOverviewPort';

export class PrismaHandoffOverviewRepository implements HandoffOverviewPort {
  findReflectionHandoffs(tenantId: string, since: Date, limit: number) {
    return prisma.reflectionHandoffLog.findMany({
      where: { tenantId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        summary: true,
        createdAt: true,
        sourceAgentKey: true,
        targetAgentKey: true,
        parentRunId: true,
      },
    }).then((rows) =>
      rows.map((row) => ({
        id: row.id,
        summary: row.summary,
        createdAt: row.createdAt,
        fromAgentKey: row.sourceAgentKey,
        toAgentKey: row.targetAgentKey,
        parentRunId: row.parentRunId,
      }))
    );
  }

  findPeerJobs(tenantId: string, since: Date, limit: number) {
    return prisma.agentPeerJob.findMany({
      where: {
        tenantId,
        createdAt: { gte: since },
        status: { in: ['completed', 'failed', 'running', 'pending'] },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        sourceAgentKey: true,
        targetAgentKey: true,
        status: true,
        createdAt: true,
        completedAt: true,
        updatedAt: true,
        intent: true,
        resultPayload: true,
        query: true,
        parentRunId: true,
      },
    }).then((rows) =>
      rows.map((job) => ({
        id: job.id,
        fromAgentKey: job.sourceAgentKey,
        toAgentKey: job.targetAgentKey,
        status: job.status,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        updatedAt: job.updatedAt,
        intent: job.intent,
        resultPayload: job.resultPayload,
        query: job.query,
        parentRunId: job.parentRunId,
      }))
    );
  }
}
