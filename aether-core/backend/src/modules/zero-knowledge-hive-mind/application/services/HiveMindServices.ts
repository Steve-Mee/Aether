import { logger } from '../../../../shared/logging/logger';
import type { FederatedHivePort } from '../ports/FederatedHivePort';
import type { PrivacyBudgetPort, InsightQueryPort } from '../ports/PrivacyBudgetPort';

export class PrivacyBudgetService {
  constructor(private budget: PrivacyBudgetPort) {}

  async getOrCreate(tenantId: string) {
    return this.budget.getOrCreate(tenantId);
  }

  async canSpend(tenantId: string, cost = 1.0): Promise<boolean> {
    const row = await this.getOrCreate(tenantId);
    return row.spent + cost <= row.budgetLimit;
  }

  async spend(tenantId: string, cost = 1.0): Promise<void> {
    await this.budget.spend(tenantId, cost);
  }
}

export class FederatedAggregationService {
  constructor(
    private federatedHive: FederatedHivePort,
    private insights: InsightQueryPort,
    private budget: PrivacyBudgetPort
  ) {}

  async runBatchAggregation(tenantId: string): Promise<{ categories: Record<string, number>; insightCount: number }> {
    const insightRows = await this.insights.listRecent(tenantId, 1000);
    const categories: Record<string, number> = {};
    for (const i of insightRows) {
      categories[i.type] = (categories[i.type] ?? 0) + 1;
    }
    logger.info('hive_federated_batch', { tenantId, insightCount: insightRows.length });
    return { categories, insightCount: insightRows.length };
  }

  async getAggregatedInsights(tenantId: string) {
    const batch = await this.federatedHive.runBatch(tenantId);
    const budget = await this.budget.getOrCreate(tenantId);
    return {
      tenantId,
      aggregated: true,
      anonymization: 'HMAC commitment + optional Laplace noise (not ZK-SNARK)',
      privacyBudget: { spent: budget.spent, budgetLimit: budget.budgetLimit },
      ...batch,
    };
  }
}
