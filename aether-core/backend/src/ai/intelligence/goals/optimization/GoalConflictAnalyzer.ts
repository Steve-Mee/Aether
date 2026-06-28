import type { MerchantGoalRecord } from '../types';
import { GOAL_METRIC_AGENT_MAP } from '../types';

export type GoalConflictType = 'metric_opposition' | 'resource_contention' | 'deadline_cluster';

export interface GoalConflict {
  type: GoalConflictType;
  goalIds: string[];
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface RankedGoal {
  goal: MerchantGoalRecord;
  priorityScore: number;
  conflictWarnings: string[];
}

const OPPOSING_PAIRS: Array<[string, string]> = [
  ['margin', 'revenue'],
];

export class GoalConflictAnalyzer {
  analyze(goals: MerchantGoalRecord[]): GoalConflict[] {
    const active = goals.filter((g) => g.status === 'active');
    const conflicts: GoalConflict[] = [];

    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i];
        const b = active[j];
        if (this.isMetricOpposition(a, b)) {
          conflicts.push({
            type: 'metric_opposition',
            goalIds: [a.id, b.id],
            message: `Doelen "${a.title}" en "${b.title}" kunnen elkaar tegenwerken.`,
            severity: 'medium',
          });
        }
        if (this.isResourceContention(a, b)) {
          conflicts.push({
            type: 'resource_contention',
            goalIds: [a.id, b.id],
            message: `Beide doelen concurreren om dezelfde agent (${GOAL_METRIC_AGENT_MAP[a.metricType]}).`,
            severity: 'medium',
          });
        }
      }
    }

    const clusterWindowMs = 7 * 86_400_000;
    const now = Date.now();
    const clustered = active.filter(
      (g) => g.deadline.getTime() - now <= clusterWindowMs && g.deadline.getTime() >= now
    );
    if (clustered.length >= 3) {
      conflicts.push({
        type: 'deadline_cluster',
        goalIds: clustered.map((g) => g.id),
        message: `${clustered.length} doelen hebben een deadline binnen 7 dagen.`,
        severity: 'high',
      });
    }

    return conflicts;
  }

  private isMetricOpposition(a: MerchantGoalRecord, b: MerchantGoalRecord): boolean {
    if (a.direction !== b.direction && a.metricType === b.metricType) return true;
    return OPPOSING_PAIRS.some(
      ([x, y]) =>
        (a.metricType === x && b.metricType === y) ||
        (a.metricType === y && b.metricType === x)
    );
  }

  private isResourceContention(a: MerchantGoalRecord, b: MerchantGoalRecord): boolean {
    if (a.pursuitMode !== 'aggressive' || b.pursuitMode !== 'aggressive') return false;
    return GOAL_METRIC_AGENT_MAP[a.metricType] === GOAL_METRIC_AGENT_MAP[b.metricType];
  }
}
