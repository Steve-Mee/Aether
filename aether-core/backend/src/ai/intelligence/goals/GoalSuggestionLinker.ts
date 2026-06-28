import type { ProactiveFinding } from '../proactive/ProactiveTriggerDefinition';
import { GoalRepository } from './GoalRepository';
import { GoalConflictAnalyzer } from './optimization/GoalConflictAnalyzer';
import { GoalPriorityResolver } from './optimization/GoalPriorityResolver';
import type { GoalMetricType, MerchantGoalRecord } from './types';
import { isGoalMultiOptimizationEnabled } from './goalConfig';

const TRIGGER_METRIC_MAP: Record<string, GoalMetricType[]> = {
  'pricing.margin_decline': ['margin'],
  'inventory.low_stock': ['inventory'],
  'supplier.price_drop': ['margin', 'inventory'],
  'orders.anomaly': ['revenue'],
  'goals.progress_drift': ['margin', 'revenue', 'inventory', 'category_revenue'],
};

export class GoalSuggestionLinker {
  private conflictAnalyzer = new GoalConflictAnalyzer();
  private priorityResolver = new GoalPriorityResolver();

  constructor(private repository: GoalRepository) {}

  async linkFinding(tenantId: string, finding: ProactiveFinding): Promise<ProactiveFinding> {
    const metricTypes = TRIGGER_METRIC_MAP[finding.triggerId];
    if (!metricTypes?.length) return finding;
    if (finding.goalId) return finding;

    const goals = await this.repository.listActiveForProgress(tenantId);
    const matched = isGoalMultiOptimizationEnabled()
      ? this.findBestMatchOptimized(goals, metricTypes)
      : this.findBestMatchByProgress(goals, metricTypes);
    if (!matched) return finding;

    const priorityBoost =
      matched.pursuitMode === 'aggressive' ? 4 : matched.pursuitMode === 'balanced' ? 2 : 1;

    return {
      ...finding,
      goalId: matched.id,
      title: `Voor je doel "${matched.title}": ${finding.title}`,
      priority: finding.priority + priorityBoost,
      evidence: {
        ...finding.evidence,
        goalId: matched.id,
        goalTitle: matched.title,
      },
    };
  }

  private findBestMatchOptimized(
    goals: MerchantGoalRecord[],
    metricTypes: GoalMetricType[]
  ): MerchantGoalRecord | null {
    const candidates = goals.filter((g) => metricTypes.includes(g.metricType));
    if (candidates.length === 0) return null;
    const conflicts = this.conflictAnalyzer.analyze(goals);
    const ranked = this.priorityResolver.rank(candidates, conflicts);
    return ranked[0]?.goal ?? candidates[0];
  }

  private findBestMatchByProgress(
    goals: MerchantGoalRecord[],
    metricTypes: GoalMetricType[]
  ): MerchantGoalRecord | null {
    const candidates = goals.filter((g) => metricTypes.includes(g.metricType));
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];
    const withLowestProgress = [...candidates].sort(
      (a, b) => (a.progressPct ?? 0) - (b.progressPct ?? 0)
    );
    return withLowestProgress[0] ?? candidates[0];
  }
}
