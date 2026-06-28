import { GoalToPlanNodeBuilder } from '../planning/GoalToPlanNodeBuilder';
import type { MerchantGoalRecord } from '../types';

describe('GoalToPlanNodeBuilder', () => {
  it('builds supervisor plan with agent children', () => {
    const goals: MerchantGoalRecord[] = [
      {
        id: 'g1',
        tenantId: 't1',
        title: 'Marge',
        description: null,
        metricType: 'margin',
        metricScope: {},
        targetValue: 25,
        baselineValue: 18,
        currentValue: 19,
        unit: 'percent',
        direction: 'increase',
        deadline: new Date(),
        status: 'active',
        pursuitMode: 'balanced',
        parentGoalId: null,
        progressPct: 20,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      },
      {
        id: 'g2',
        tenantId: 't1',
        title: 'Voorraad',
        description: null,
        metricType: 'inventory',
        metricScope: {},
        targetValue: 5,
        baselineValue: 12,
        currentValue: 10,
        unit: 'count',
        direction: 'decrease',
        deadline: new Date(),
        status: 'active',
        pursuitMode: 'balanced',
        parentGoalId: null,
        progressPct: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      },
    ];

    const plan = new GoalToPlanNodeBuilder().build(goals);
    expect(plan.kind).toBe('supervisor');
    if (plan.kind === 'supervisor') {
      expect(plan.subPlan?.kind).toBe('group');
      if (plan.subPlan?.kind === 'group') {
        expect(plan.subPlan.children).toHaveLength(2);
      }
    }
  });
});
