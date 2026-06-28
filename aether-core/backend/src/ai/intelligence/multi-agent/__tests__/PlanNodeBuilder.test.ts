import { AgentRegistry } from '../AgentRegistry';
import { DEFAULT_SPECIALIST_AGENTS } from '../agents';
import {
  buildAgentNode,
  buildGroupNode,
  buildParallelThenSequential,
  countPlanAgents,
  flattenPlan,
  planDepth,
  validatePlanNode,
  compoundToExecutionPlan,
} from '../PlanNodeBuilder';

describe('PlanNodeBuilder', () => {
  const registry = new AgentRegistry(DEFAULT_SPECIALIST_AGENTS);

  it('flattens nested parallel-then-sequential plan', () => {
    const root = buildParallelThenSequential(
      [
        { agentKey: 'pricing', intent: 'PRICING_OPTIMIZE' },
        { agentKey: 'inventory', intent: 'INVENTORY_STATUS' },
      ],
      { agentKey: 'mail', intent: 'EMAIL_SUMMARY' }
    );
    const agents = flattenPlan(root);
    expect(agents.map((a) => a.agentKey).sort()).toEqual(['inventory', 'mail', 'pricing']);
    expect(planDepth(root)).toBe(3);
  });

  it('validates max depth', () => {
    let node = buildAgentNode('pricing', 'PRICING');
    for (let i = 0; i < 5; i++) {
      node = buildGroupNode('sequential', [node, buildAgentNode('inventory', 'INVENTORY')]);
    }
    expect(() => validatePlanNode(node, 3)).toThrow(/depth/i);
  });

  it('builds compound plan from sub-goals', () => {
    const plan = compoundToExecutionPlan(
      [
        { intent: 'INVENTORY_STATUS', command: 'stock check' },
        { intent: 'EMAIL_SUMMARY', command: 'mail summary' },
      ],
      registry,
      'parallel'
    );
    expect(plan.agents.length).toBe(2);
    if (plan.root) {
      expect(countPlanAgents(plan.root)).toBe(2);
    }
  });
});
