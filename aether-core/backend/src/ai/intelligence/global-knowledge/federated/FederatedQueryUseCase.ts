import { prisma } from '../../../../shared/prisma/client';
import type { PrivacyBudgetPort } from '../../../../modules/zero-knowledge-hive-mind/application/ports/PrivacyBudgetPort';
import { PrivacyBudgetService } from '../../../../modules/zero-knowledge-hive-mind/application/services/HiveMindServices';
import { addLaplaceNoise, meetsKAnonymity } from './privacyUtils';
import { parseHiveInsightRow } from './parseHiveInsightRow';
import { LAPLACE_EPSILON } from '../types';
import type { KnowledgePatch } from '../types';

export class FederatedQueryUseCase {
  constructor(private privacyBudget: PrivacyBudgetService) {}

  async queryMetric(category: string, metric: string, tenantId: string): Promise<KnowledgePatch | null> {
    const row = await prisma.globalInsight.findUnique({
      where: { category_metric: { category, metric } },
    });
    if (!row || !meetsKAnonymity(row.tenantCount, row.sampleSize)) {
      return null;
    }

    const canQuery = await this.privacyBudget.canSpend(tenantId, 0.5);
    if (!canQuery) return null;

    await this.privacyBudget.spend(tenantId, 0.5);

    const noisyValue = addLaplaceNoise(row.value, 1, row.noiseEpsilon || LAPLACE_EPSILON);

    return {
      id: `federated:${category}:${metric}`,
      version: 'federated-1.0.0',
      kind: 'metric_insight',
      category,
      title: `Federated ${metric}`,
      content: `Cross-merchant avg ${metric}≈${noisyValue.toFixed(3)} (tenants=${row.tenantCount}, n=${row.sampleSize})`,
      priority: row.tenantCount >= 10 ? 9 : 7,
      minProfile: 'conservative',
      tags: ['federated', metric],
    };
  }

  async listFederatedPatches(tenantId: string): Promise<KnowledgePatch[]> {
    if (process.env.INTELLIGENCE_GLOBAL_KNOWLEDGE_V2 !== 'true') return [];

    const rows = await prisma.globalInsight.findMany({ orderBy: { updatedAt: 'desc' } });
    const patches: KnowledgePatch[] = [];

    for (const row of rows) {
      const patch = await this.queryMetric(row.category, row.metric, tenantId);
      if (patch) patches.push(patch);
    }

    return patches;
  }
}

export class CrossTenantSubmitPipeline {
  async refreshFromTenantInsights(): Promise<number> {
    if (process.env.INTELLIGENCE_GLOBAL_KNOWLEDGE_V2 !== 'true') return 0;

    const optedIn = await prisma.tenantSettings.findMany({
      where: { brainFederatedContributionEnabled: true },
      select: { tenantId: true },
    });
    const optedInTenants = new Set(optedIn.map((t) => t.tenantId));
    if (optedInTenants.size === 0) return 0;

    const insights = await prisma.insight.findMany({
      where: { tenantId: { in: [...optedInTenants] } },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const buckets = new Map<
      string,
      { category: string; metric: string; values: number[]; tenants: Set<string> }
    >();

    for (const row of insights) {
      if (!optedInTenants.has(row.tenantId)) continue;
      const parsed = parseHiveInsightRow(row);
      if (!parsed) continue;
      const key = `${parsed.category}:${parsed.metric}`;
      const bucket = buckets.get(key) ?? {
        category: parsed.category,
        metric: parsed.metric,
        values: [],
        tenants: new Set<string>(),
      };
      bucket.values.push(parsed.value);
      bucket.tenants.add(row.tenantId);
      buckets.set(key, bucket);
    }

    let upserted = 0;
    for (const bucket of buckets.values()) {
      if (!meetsKAnonymity(bucket.tenants.size, bucket.values.length)) continue;
      const avg = bucket.values.reduce((a, b) => a + b, 0) / bucket.values.length;
      await prisma.globalInsight.upsert({
        where: { category_metric: { category: bucket.category, metric: bucket.metric } },
        create: {
          category: bucket.category,
          metric: bucket.metric,
          value: avg,
          sampleSize: bucket.values.length,
          tenantCount: bucket.tenants.size,
          noiseEpsilon: LAPLACE_EPSILON,
        },
        update: {
          value: avg,
          sampleSize: bucket.values.length,
          tenantCount: bucket.tenants.size,
        },
      });
      upserted++;
    }

    return upserted;
  }
}

export function createFederatedQueryUseCase(budgetPort: PrivacyBudgetPort): FederatedQueryUseCase {
  return new FederatedQueryUseCase(new PrivacyBudgetService(budgetPort));
}