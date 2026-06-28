import { recordOutcome } from '../../attribution/OutcomeEngine';
import { eventBus } from '../../../shared/events/eventBus';
import { logger } from '../../../shared/logging/logger';
import type { GoalMetricType, MerchantGoalRecord } from './types';
import { isGoalOutcomeAttributionEnabled } from './goalConfig';

const METRIC_MAP: Record<GoalMetricType, string> = {
  margin: 'margin_pct',
  revenue: 'order_volume',
  inventory: 'low_stock_count',
  category_revenue: 'category_trend_pct',
};

export interface GoalOutcomeResult {
  outcomeRecordId: string;
  uplift: number;
  metric: string;
}

export class GoalOutcomeAttributionService {
  async recordGoalCompletion(
    tenantId: string,
    goal: MerchantGoalRecord,
    opts?: { sourceType?: string; sourceId?: string; rootRunId?: string }
  ): Promise<GoalOutcomeResult | null> {
    if (!isGoalOutcomeAttributionEnabled()) return null;

    const observed = goal.currentValue ?? goal.targetValue;
    const baseline = goal.baselineValue;
    const periodEnd = goal.completedAt ?? new Date();
    const metric = METRIC_MAP[goal.metricType] ?? `goal_${goal.metricType}`;

    try {
      const { id, uplift } = await recordOutcome({
        tenantId,
        metric,
        baseline,
        observed,
        confidence: 0.75,
        periodStart: goal.createdAt,
        periodEnd,
        verificationStatus: 'proposed',
        goalId: goal.id,
        sourceType: opts?.sourceType ?? 'goal_completion',
        sourceId: opts?.sourceId ?? goal.id,
        rootRunId: opts?.rootRunId,
      });

      await eventBus.publish({
        tenantId,
        type: 'goal.completed',
        payload: {
          goalId: goal.id,
          outcomeRecordId: id,
          metric,
          uplift,
          metricType: goal.metricType,
          progressPct: goal.progressPct,
        },
      });

      return { outcomeRecordId: id, uplift, metric };
    } catch (error) {
      logger.warn('goal_outcome_attribution_failed', {
        tenantId,
        goalId: goal.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async findLatestForGoal(tenantId: string, goalId: string) {
    const { prisma } = await import('../../../shared/prisma/client');
    return prisma.outcomeRecord.findFirst({
      where: { tenantId, goalId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
