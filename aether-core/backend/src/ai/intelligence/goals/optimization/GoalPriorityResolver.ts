import type { GoalConflict } from './GoalConflictAnalyzer';
import type { MerchantGoalRecord } from '../types';

export interface RankedGoal {
  goal: MerchantGoalRecord;
  priorityScore: number;
  conflictWarnings: string[];
}

export class GoalPriorityResolver {
  rank(goals: MerchantGoalRecord[], conflicts: GoalConflict[]): RankedGoal[] {
    const conflictCount = new Map<string, number>();
    const warnings = new Map<string, string[]>();

    for (const conflict of conflicts) {
      for (const goalId of conflict.goalIds) {
        conflictCount.set(goalId, (conflictCount.get(goalId) ?? 0) + 1);
        const list = warnings.get(goalId) ?? [];
        list.push(conflict.message);
        warnings.set(goalId, list);
      }
    }

    return goals
      .map((goal) => {
        const progressGap = 100 - (goal.progressPct ?? 0);
        const daysLeft = Math.max(
          1,
          Math.ceil((goal.deadline.getTime() - Date.now()) / 86_400_000)
        );
        const urgency = 100 / daysLeft;
        const weight = goal.priorityWeight ?? 1;
        const conflictPenalty = (conflictCount.get(goal.id) ?? 0) * 15;
        const pursuitBoost =
          goal.pursuitMode === 'aggressive' ? 10 : goal.pursuitMode === 'balanced' ? 5 : 0;
        const priorityScore =
          progressGap * 0.4 + urgency * 0.3 + pursuitBoost + weight * 10 - conflictPenalty;

        return {
          goal,
          priorityScore,
          conflictWarnings: warnings.get(goal.id) ?? [],
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }

  pickBestForMetrics(
    ranked: RankedGoal[],
    metricTypes: string[]
  ): MerchantGoalRecord | null {
    const match = ranked.find((r) => metricTypes.includes(r.goal.metricType));
    return match?.goal ?? null;
  }
}
