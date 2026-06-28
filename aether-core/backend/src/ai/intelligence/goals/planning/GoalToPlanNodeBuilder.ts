import type { PlanNode } from '../../multi-agent/types';
import type { MerchantGoalRecord } from '../types';
import { GOAL_METRIC_AGENT_MAP } from '../types';

const METRIC_INTENT: Record<string, string> = {
  margin: 'PRICING_OPTIMIZE',
  revenue: 'PLAN_AND_DELEGATE',
  inventory: 'RESTOCK_SUGGEST',
  category_revenue: 'PRICING_OPTIMIZE',
};

export class GoalToPlanNodeBuilder {
  build(goals: MerchantGoalRecord[]): PlanNode {
    const active = goals.filter((g) => g.status === 'active');
    const agentNodes: PlanNode[] = active.map((goal) => ({
      kind: 'agent' as const,
      agentKey: GOAL_METRIC_AGENT_MAP[goal.metricType] ?? 'workflow_supervisor',
      intent: METRIC_INTENT[goal.metricType] ?? 'PLAN_AND_DELEGATE',
      command: `Werk aan doel: ${goal.title}`,
    }));

    const grouped: PlanNode =
      agentNodes.length <= 1
        ? agentNodes[0] ?? {
            kind: 'agent',
            agentKey: 'workflow_supervisor',
            intent: 'PLAN_AND_DELEGATE',
          }
        : {
            kind: 'group',
            mode: active.some((g) => g.pursuitMode === 'aggressive') ? 'parallel' : 'sequential',
            children: agentNodes,
          };

    return {
      kind: 'supervisor',
      agentKey: 'workflow_supervisor',
      intent: 'PLAN_AND_DELEGATE',
      command: 'Coördineer doelgerichte multi-agent planning',
      subPlan: grouped,
    };
  }
}
