import { CollaborationGraphBuilder } from '../CollaborationGraphBuilder';
import type { ExecutionPlan } from '../../types';

describe('CollaborationGraphBuilder', () => {
  const builder = new CollaborationGraphBuilder();

  it('builds sequential graph with agent nodes and merge', () => {
    const plan: ExecutionPlan = {
      mode: 'sequential',
      agents: [
        { agentKey: 'supplier', intent: 'SUPPLIER_PRICE_INTEL' },
        { agentKey: 'pricing', intent: 'PRICING_OPTIMIZE' },
      ],
    };

    const graph = builder.buildFromPlan(plan, 'optimize prices with supplier data');
    expect(graph).not.toBeNull();
    expect(graph!.nodes.filter((n) => n.kind === 'agent')).toHaveLength(2);
    expect(graph!.nodes.some((n) => n.kind === 'merge')).toBe(true);
  });

  it('builds parallel fork/join for parallel mode', () => {
    const plan: ExecutionPlan = {
      mode: 'parallel',
      agents: [
        { agentKey: 'inventory', intent: 'INVENTORY_STATUS' },
        { agentKey: 'mail', intent: 'EMAIL_SUMMARY' },
      ],
    };

    const graph = builder.buildFromPlan(plan, 'stock and mail');
    expect(graph!.nodes.some((n) => n.kind === 'parallel_fork')).toBe(true);
    expect(graph!.nodes.some((n) => n.kind === 'parallel_join')).toBe(true);
  });
});
