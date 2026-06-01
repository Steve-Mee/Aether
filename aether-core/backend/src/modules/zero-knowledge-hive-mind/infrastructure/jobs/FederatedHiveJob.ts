import { prisma } from '../../../../shared/prisma/client';
import { logger } from '../../../../shared/logging/logger';

/** Laplace noise for differential privacy in federated aggregates. */
function laplaceNoise(sensitivity: number, epsilon: number): number {
  const u = Math.random() - 0.5;
  return -sensitivity * Math.sign(u) * Math.log(1 - 2 * Math.abs(u)) / epsilon;
}

export async function runFederatedHiveJob(tenantId: string): Promise<{
  categories: Record<string, number>;
  insightCount: number;
  noiseApplied: boolean;
}> {
  const epsilon = parseFloat(process.env.HIVE_DP_EPSILON ?? '1.0');
  const insights = await prisma.insight.findMany({
    where: { tenantId },
    take: 1000,
    orderBy: { createdAt: 'desc' },
  });

  const categories: Record<string, number> = {};
  for (const i of insights) {
    categories[i.type] = (categories[i.type] ?? 0) + 1;
  }

  const noiseApplied = insights.length > 0;
  if (noiseApplied) {
    for (const key of Object.keys(categories)) {
      categories[key] = Math.max(0, Math.round(categories[key] + laplaceNoise(1, epsilon)));
    }
  }

  logger.info('hive_federated_job_complete', { tenantId, insightCount: insights.length, noiseApplied });
  return { categories, insightCount: insights.length, noiseApplied };
}
