import { prisma } from '../../../../shared/prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { PrivacyBudgetPort, InsightQueryPort } from '../../application/ports/PrivacyBudgetPort';

const INSIGHT_COST = 1.0;

export class PrismaPrivacyBudgetAdapter implements PrivacyBudgetPort {
  async getOrCreate(tenantId: string) {
    const tid = requireTenantId(tenantId, 'PrivacyBudget.getOrCreate');
    return prisma.privacyBudget.upsert({
      where: { tenantId: tid },
      create: { tenantId: tid, spent: 0, budgetLimit: 100 },
      update: {},
    });
  }

  async spend(tenantId: string, cost = INSIGHT_COST): Promise<void> {
    const tid = requireTenantId(tenantId, 'PrivacyBudget.spend');
    const budget = await this.getOrCreate(tid);
    if (budget.spent + cost > budget.budgetLimit) {
      throw new Error('Privacy budget exceeded');
    }
    await prisma.privacyBudget.update({
      where: { tenantId: tid },
      data: { spent: budget.spent + cost },
    });
  }
}

export class PrismaInsightQueryAdapter implements InsightQueryPort {
  async listRecent(tenantId: string, limit: number) {
    const tid = requireTenantId(tenantId, 'InsightQuery.listRecent');
    return prisma.insight.findMany({
      where: { tenantId: tid },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { type: true },
    });
  }
}

export const privacyBudgetAdapter = new PrismaPrivacyBudgetAdapter();
export const insightQueryAdapter = new PrismaInsightQueryAdapter();
