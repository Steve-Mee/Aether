import { GoalRepository } from './GoalRepository';
import type { MerchantGoalRecord } from './types';
import { GOAL_METRIC_AGENT_MAP } from './types';
import { isGoalsEnabled, isGoalMultiOptimizationEnabled } from './goalConfig';
import { getMerchantSettings } from '../../../shared/settings/TenantSettingsService';
import { GoalConflictAnalyzer } from './optimization/GoalConflictAnalyzer';
import { GoalPriorityResolver } from './optimization/GoalPriorityResolver';

const AGENT_METRIC_MAP: Record<string, string[]> = {
  pricing: ['margin', 'category_revenue'],
  inventory: ['inventory'],
  supplier: ['margin', 'inventory'],
  workflow_supervisor: ['revenue'],
};

export class GoalContextProvider {
  private conflictAnalyzer = new GoalConflictAnalyzer();
  private priorityResolver = new GoalPriorityResolver();

  constructor(private repository: GoalRepository) {}

  async buildActiveGoalsBlock(tenantId: string): Promise<string | null> {
    if (!isGoalsEnabled()) return null;

    const settings = await getMerchantSettings(tenantId);
    if (!settings.goalPrefs.enabled) return null;

    const goals = await this.repository.listActiveForProgress(tenantId);
    if (goals.length === 0) return null;

    const lines = goals.slice(0, 5).map((g) => this.formatGoalLine(g));
    const extra: string[] = [];

    if (isGoalMultiOptimizationEnabled()) {
      const conflicts = this.conflictAnalyzer.analyze(goals);
      if (conflicts.length > 0) {
        extra.push(
          `Conflictwaarschuwingen: ${conflicts.slice(0, 2).map((c) => c.message).join('; ')}`
        );
      }
      const ranked = this.priorityResolver.rank(goals, conflicts);
      if (ranked.length > 1) {
        extra.push(`Prioriteitsvolgorde: ${ranked.slice(0, 3).map((r) => r.goal.title).join(' → ')}`);
      }
    }

    return [
      '## Actieve merchant-doelen',
      'Prioriteer acties die meetbare voortgang opleveren richting deze doelen.',
      ...lines,
      ...extra,
    ].join('\n');
  }

  async getGoalsForAgent(tenantId: string, agentKey: string): Promise<MerchantGoalRecord[]> {
    if (!isGoalsEnabled()) return [];
    const settings = await getMerchantSettings(tenantId);
    if (!settings.goalPrefs.enabled) return [];

    const metricTypes = AGENT_METRIC_MAP[agentKey];
    let goals = await this.repository.listActiveForProgress(tenantId);
    if (isGoalMultiOptimizationEnabled() && goals.length > 1) {
      const conflicts = this.conflictAnalyzer.analyze(goals);
      goals = this.priorityResolver.rank(goals, conflicts).map((r) => r.goal);
    }
    if (!metricTypes) return goals.slice(0, 3);
    return goals.filter((g) => metricTypes.includes(g.metricType)).slice(0, 3);
  }

  async buildAgentGoalsBlock(tenantId: string, agentKey: string): Promise<string | null> {
    const goals = await this.getGoalsForAgent(tenantId, agentKey);
    if (goals.length === 0) return null;

    const lines = goals.map((g) => this.formatGoalLine(g));
    const agentLabel = GOAL_METRIC_AGENT_MAP[goals[0]?.metricType ?? 'margin'];
    return [
      `## Relevante doelen voor ${agentKey}`,
      ...(agentKey === agentLabel ? ['Deze doelen zijn direct gekoppeld aan jouw specialisme.'] : []),
      ...lines,
    ].join('\n');
  }

  private formatGoalLine(goal: MerchantGoalRecord): string {
    const progress = goal.progressPct ?? 0;
    const daysLeft = Math.max(0, Math.ceil((goal.deadline.getTime() - Date.now()) / 86_400_000));
    return (
      `- **${goal.title}** (${goal.metricType}): ${Math.round(progress)}% voortgang, ` +
      `doel ${goal.targetValue}${goal.unit === 'percent' ? '%' : ''}, ` +
      `deadline over ${daysLeft}d, modus: ${goal.pursuitMode}`
    );
  }
}
