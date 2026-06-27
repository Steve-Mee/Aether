import { prisma } from '../../../../shared/prisma/client';
import type { AgentPerformancePort, AgentPerformanceSnapshot } from './AgentPerformancePort';

const RECENT_RUN_LIMIT = 50;

export class PrismaAgentPerformanceAdapter implements AgentPerformancePort {
  async getTenantAgentScores(
    tenantId: string,
    agentKeys: string[]
  ): Promise<AgentPerformanceSnapshot[]> {
    const snapshots: AgentPerformanceSnapshot[] = [];

    for (const agentKey of agentKeys) {
      const runs = await prisma.brainAgentRun.findMany({
        where: {
          tenantId,
          agentKey,
          status: { in: ['completed', 'failed', 'cancelled'] },
        },
        orderBy: { createdAt: 'desc' },
        take: RECENT_RUN_LIMIT,
        select: { status: true, createdAt: true, updatedAt: true },
      });

      if (runs.length === 0) {
        snapshots.push({
          agentKey,
          successRate: 0.5,
          recentFailures: 0,
          sampleSize: 0,
        });
        continue;
      }

      const success = runs.filter((r) => r.status === 'completed').length;
      const recentFailures = runs.slice(0, 5).filter((r) => r.status === 'failed').length;
      const latencies = runs
        .filter((r) => r.status === 'completed')
        .map((r) => r.updatedAt.getTime() - r.createdAt.getTime());
      const avgLatencyMs =
        latencies.length > 0
          ? latencies.reduce((sum, ms) => sum + ms, 0) / latencies.length
          : undefined;

      snapshots.push({
        agentKey,
        successRate: success / runs.length,
        avgLatencyMs,
        recentFailures,
        sampleSize: runs.length,
      });
    }

    return snapshots;
  }

  async getPairSuccessRate(
    tenantId: string,
    from: string,
    to: string
  ): Promise<number | null> {
    const jobs = await prisma.agentPeerJob.findMany({
      where: {
        tenantId,
        sourceAgentKey: from,
        targetAgentKey: to,
        status: { in: ['completed', 'failed'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (jobs.length < 3) return null;
    const success = jobs.filter((j) => j.status === 'completed').length;
    return success / jobs.length;
  }
}
