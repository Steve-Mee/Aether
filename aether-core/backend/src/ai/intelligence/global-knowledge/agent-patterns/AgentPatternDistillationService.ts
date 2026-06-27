import { prisma } from '../../../../shared/prisma/client';
import type { Prisma } from '@prisma/client';
import { meetsKAnonymity } from '../federated/privacyUtils';

export interface DistilledAgentPattern {
  category: string;
  agentKey: string;
  patternType: string;
  payload: Record<string, unknown>;
  tenantCount: number;
}

export class AgentPatternDistillationService {
  async distillFromCompletedRuns(tenantId: string): Promise<DistilledAgentPattern[]> {
    const runs = await prisma.brainAgentRun.findMany({
      where: { tenantId, status: 'completed' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        agentKey: true,
        status: true,
        delegationMeta: true,
      },
    });

    if (runs.length === 0) return [];

    const byAgent = new Map<string, { success: number; total: number }>();
    for (const run of runs) {
      const key = run.agentKey ?? 'admin';
      const entry = byAgent.get(key) ?? { success: 0, total: 0 };
      entry.total += 1;
      if (run.status === 'completed') entry.success += 1;
      byAgent.set(key, entry);
    }

    const patterns: DistilledAgentPattern[] = [];
    for (const [agentKey, stats] of byAgent) {
      if (stats.total < 3) continue;
      patterns.push({
        category: 'trend',
        agentKey,
        patternType: 'run_success_rate',
        payload: {
          successRate: stats.success / stats.total,
          sampleSize: stats.total,
        },
        tenantCount: 1,
      });
    }
    return patterns;
  }

  async upsertGlobalPattern(pattern: DistilledAgentPattern): Promise<void> {
    const tenantCount = pattern.tenantCount;
    const kMet = meetsKAnonymity(tenantCount, Number(pattern.payload.sampleSize ?? 0));
    await prisma.globalAgentPattern.upsert({
      where: {
        category_agentKey_patternType: {
          category: pattern.category,
          agentKey: pattern.agentKey,
          patternType: pattern.patternType,
        },
      },
      create: {
        category: pattern.category,
        agentKey: pattern.agentKey,
        patternType: pattern.patternType,
        payloadJson: pattern.payload as Prisma.InputJsonValue,
        tenantCount,
        kAnonymityMet: kMet,
      },
      update: {
        payloadJson: pattern.payload as Prisma.InputJsonValue,
        tenantCount,
        kAnonymityMet: kMet,
      },
    });
  }

  async listActivePatterns(category?: string): Promise<
    Array<{ agentKey: string; patternType: string; snippet: string }>
  > {
    const rows = await prisma.globalAgentPattern.findMany({
      where: {
        kAnonymityMet: true,
        ...(category ? { category } : {}),
      },
      take: 20,
    });
    return rows.map((row: { agentKey: string; patternType: string; tenantCount: number }) => ({
      agentKey: row.agentKey,
      patternType: row.patternType,
      snippet: `[Agent pattern] ${row.agentKey}: ${row.patternType} (n=${row.tenantCount})`,
    }));
  }
}
