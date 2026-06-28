import type { AdminDataPort } from '../../../modules/admin-command-bar/application/ports/AdminDataPort';
import type { GoalMetricScope, GoalMetricType, MerchantGoalRecord } from './types';

export interface ResolvedMetricValue {
  value: number;
  metadata?: Record<string, unknown>;
  atRisk?: boolean;
  atRiskReason?: string;
}

export class GoalMetricResolver {
  constructor(private adminData: AdminDataPort) {}

  async resolve(tenantId: string, goal: MerchantGoalRecord): Promise<ResolvedMetricValue> {
    const scope = goal.metricScope;
    const threshold = scope.threshold ?? 25;

    switch (goal.metricType) {
      case 'margin':
        return this.resolveMargin(tenantId, threshold);
      case 'revenue':
        return this.resolveRevenue(tenantId);
      case 'inventory':
        return this.resolveInventory(tenantId, scope);
      case 'category_revenue':
        return this.resolveCategoryRevenue(tenantId, scope);
      default:
        return { value: goal.currentValue ?? goal.baselineValue, atRisk: true, atRiskReason: 'Onbekend metriektype' };
    }
  }

  async resolveBaseline(tenantId: string, metricType: GoalMetricType, scope: GoalMetricScope): Promise<number> {
    const resolved = await this.resolve(tenantId, {
      metricType,
      metricScope: scope,
      baselineValue: 0,
      targetValue: 1,
      currentValue: null,
    } as MerchantGoalRecord);
    return resolved.value;
  }

  private async resolveMargin(tenantId: string, threshold: number): Promise<ResolvedMetricValue> {
    const metrics = await this.adminData.getMarginMetrics(tenantId, threshold);
    return {
      value: metrics.marginPct,
      metadata: { lowMarginCount: metrics.lowMarginCount, totalProducts: metrics.totalProducts },
    };
  }

  private async resolveRevenue(tenantId: string): Promise<ResolvedMetricValue> {
    const trends = await this.adminData.getOrderTrends(tenantId, 30);
    return {
      value: trends.recentCount,
      metadata: { trendPct: trends.trendPct, priorCount: trends.priorCount },
    };
  }

  private async resolveInventory(tenantId: string, scope: GoalMetricScope): Promise<ResolvedMetricValue> {
    const threshold = scope.threshold ?? 10;
    const summary = await this.adminData.getInventoryCostSummary(tenantId, threshold);
    return {
      value: summary.lowStockCount,
      metadata: { totalSkus: summary.totalSkus, totalQuantity: summary.totalQuantity },
    };
  }

  private async resolveCategoryRevenue(tenantId: string, scope: GoalMetricScope): Promise<ResolvedMetricValue> {
    const categoryId = scope.categoryId ?? scope.productSlug ?? '';
    if (!categoryId) {
      return { value: 0, atRisk: true, atRiskReason: 'Geen categorie gedefinieerd' };
    }
    const metrics = await this.adminData.getCategoryRevenue(tenantId, categoryId, 30);
    if (metrics.orderCount === 0 && metrics.revenue === 0) {
      return {
        value: 0,
        atRisk: true,
        atRiskReason: `Geen omzet gevonden voor categorie "${categoryId}"`,
        metadata: { ...metrics },
      };
    }
    return {
      value: metrics.trendPct,
      metadata: { ...metrics },
    };
  }
}
