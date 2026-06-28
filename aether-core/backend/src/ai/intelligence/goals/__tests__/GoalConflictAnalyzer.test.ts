import { GoalConflictAnalyzer } from '../optimization/GoalConflictAnalyzer';
import type { MerchantGoalRecord } from '../types';

function goal(partial: Partial<MerchantGoalRecord> & Pick<MerchantGoalRecord, 'id' | 'title'>): MerchantGoalRecord {
  return {
    tenantId: 't1',
    description: null,
    metricType: 'margin',
    metricScope: {},
    targetValue: 30,
    baselineValue: 20,
    currentValue: 22,
    unit: 'percent',
    direction: 'increase',
    deadline: new Date(Date.now() + 3 * 86_400_000),
    status: 'active',
    pursuitMode: 'aggressive',
    parentGoalId: null,
    progressPct: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    ...partial,
  };
}

describe('GoalConflictAnalyzer', () => {
  const analyzer = new GoalConflictAnalyzer();

  it('detects resource contention for same agent aggressive goals', () => {
    const conflicts = analyzer.analyze([
      goal({ id: 'a', title: 'A', metricType: 'margin' }),
      goal({ id: 'b', title: 'B', metricType: 'category_revenue' }),
    ]);
    expect(conflicts.some((c) => c.type === 'resource_contention')).toBe(true);
  });

  it('detects deadline cluster', () => {
    const soon = new Date(Date.now() + 2 * 86_400_000);
    const conflicts = analyzer.analyze([
      goal({ id: 'a', title: 'A', deadline: soon }),
      goal({ id: 'b', title: 'B', deadline: soon, metricType: 'revenue' }),
      goal({ id: 'c', title: 'C', deadline: soon, metricType: 'inventory', direction: 'decrease' }),
    ]);
    expect(conflicts.some((c) => c.type === 'deadline_cluster')).toBe(true);
  });
});
