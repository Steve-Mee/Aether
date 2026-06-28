import { buildFlowGraph } from '../buildFlowGraph';
import type { ExplainabilityBuildContext } from '../types';

describe('buildFlowGraph', () => {
  const baseAgents: ExplainabilityBuildContext['agents'] = [
    { agentKey: 'inventory', role: 'specialist', label: 'Voorraad-agent' },
    { agentKey: 'pricing', role: 'specialist', label: 'Prijs-agent' },
  ];

  it('builds sequential chain from handoffs', () => {
    const graph = buildFlowGraph({
      agents: baseAgents,
      handoffChain: [
        { from: 'inventory', to: 'pricing', reason: 'Prijs check', mode: 'sync' },
      ],
      executionMode: 'sequential',
    });
    expect(graph).toBeDefined();
    expect(graph!.nodes.some((n) => n.id === 'inventory')).toBe(true);
    expect(graph!.edges.some((e) => e.source === 'inventory' && e.target === 'pricing')).toBe(true);
  });

  it('builds parallel siblings from start', () => {
    const graph = buildFlowGraph({
      agents: baseAgents,
      handoffChain: [],
      executionMode: 'parallel',
    });
    expect(graph!.edges.filter((e) => e.source === 'start')).toHaveLength(2);
  });

  it('marks async handoffs with dashed edges', () => {
    const graph = buildFlowGraph({
      agents: baseAgents,
      handoffChain: [
        {
          from: 'inventory',
          to: 'pricing',
          reason: 'Async job',
          mode: 'async',
          status: 'pending',
        },
      ],
      executionMode: 'sequential',
    });
    const edge = graph!.edges.find((e) => e.target === 'pricing');
    expect(edge?.style?.strokeDasharray).toBe('5 5');
    expect(edge?.animated).toBe(true);
  });
});
