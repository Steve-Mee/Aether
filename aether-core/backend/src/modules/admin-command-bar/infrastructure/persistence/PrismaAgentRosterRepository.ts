import { prisma } from '../../../../shared/prisma/client';
import type { AgentRosterPort } from '../../application/ports/AgentRosterPort';

export class PrismaAgentRosterRepository implements AgentRosterPort {
  async findActiveAgentKeys(tenantId: string, since: Date): Promise<string[]> {
    const rows = await prisma.brainAgentRun.findMany({
      where: { tenantId, updatedAt: { gte: since } },
      select: { agentKey: true },
      distinct: ['agentKey'],
    });
    return rows.map((row) => row.agentKey);
  }

  groupProactiveByAgent(tenantId: string) {
    return prisma.proactiveSuggestion.groupBy({
      by: ['agentKey'],
      where: {
        tenantId,
        status: { in: ['active', 'snoozed'] },
      },
      _count: { _all: true },
    }).then((rows) =>
      rows.map((row) => ({ agentKey: row.agentKey, count: row._count._all })),
    );
  }

  findExplainabilityAgentKeys(tenantId: string, since: Date) {
    return prisma.agentExplainabilitySnapshot.findMany({
      where: { tenantId, createdAt: { gte: since } },
      select: { agentKeys: true },
    });
  }

  findLastRunByAgents(tenantId: string, agentKeys: string[]) {
    return prisma.brainAgentRun.findMany({
      where: { tenantId, agentKey: { in: agentKeys } },
      orderBy: { updatedAt: 'desc' },
      distinct: ['agentKey'],
      select: { agentKey: true, updatedAt: true },
    });
  }

  findProactiveForAgent(tenantId: string, agentKey: string, since: Date, limit: number) {
    return prisma.proactiveSuggestion.findMany({
      where: {
        tenantId,
        agentKey,
        status: { in: ['active', 'snoozed', 'executed', 'dismissed'] },
        createdAt: { gte: since },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        summary: true,
        command: true,
        triggerId: true,
        status: true,
        createdAt: true,
      },
    });
  }

  findExplainabilityForAgent(tenantId: string, agentKey: string, since: Date, limit: number) {
    return prisma.agentExplainabilitySnapshot.findMany({
      where: {
        tenantId,
        agentKeys: { has: agentKey },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        sourceType: true,
        sourceId: true,
        summary: true,
        agentKeys: true,
        createdAt: true,
      },
    });
  }
}
