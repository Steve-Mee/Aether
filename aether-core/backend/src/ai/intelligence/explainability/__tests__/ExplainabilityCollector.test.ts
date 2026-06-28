import { ExplainabilityCollector } from '../ExplainabilityCollector';

describe('ExplainabilityCollector', () => {
  it('observes agent and reflection stream events', () => {
    const collector = new ExplainabilityCollector();
    collector.observe({
      type: 'agent_started',
      agentKey: 'inventory',
      timestamp: '2026-01-01T10:00:00.000Z',
    });
    collector.observe({
      type: 'reflection',
      observation: 'Voorraad is laag voor 12 SKU\'s',
      nextAction: 'Stel aanvulling voor',
      timestamp: '2026-01-01T10:01:00.000Z',
    });
    collector.observe({
      type: 'agent_handoff',
      fromAgentKey: 'inventory',
      toAgentKey: 'pricing',
      handoffReason: 'Marge review nodig',
      timestamp: '2026-01-01T10:02:00.000Z',
    });

    expect(collector.agents.has('inventory')).toBe(true);
    expect(collector.reflections).toHaveLength(1);
    expect(collector.snapshotHandoffChain()).toHaveLength(1);
  });

  it('registers data sources without duplicates', () => {
    const collector = new ExplainabilityCollector();
    collector.registerDataSources([
      { kind: 'rag', label: 'Fragment 1', preview: 'data' },
    ]);
    collector.registerDataSources([
      { kind: 'rag', label: 'Fragment 1', preview: 'data' },
      { kind: 'trigger_evidence', label: '12 low stock' },
    ]);

    expect(collector.dataSources).toHaveLength(2);
  });

  it('wraps stream callback and forwards events', () => {
    const collector = new ExplainabilityCollector();
    const received: string[] = [];
    const wrapped = collector.wrap((event) => {
      received.push(event.type);
    });

    wrapped?.({
      type: 'plan_ready',
      goal: 'Analyseer voorraad',
      timestamp: '2026-01-01T10:00:00.000Z',
    });

    expect(received).toEqual(['plan_ready']);
    expect(collector.reasoningSteps.some((s) => s.label === 'Plan opgesteld')).toBe(true);
  });

  it('builds live snapshot with flow graph', () => {
    const collector = new ExplainabilityCollector();
    collector.observe({
      type: 'agent_started',
      agentKey: 'inventory',
      timestamp: '2026-01-01T10:00:00.000Z',
    });
    collector.observe({
      type: 'agent_handoff',
      fromAgentKey: 'inventory',
      toAgentKey: 'pricing',
      handoffReason: 'Prijs',
      timestamp: '2026-01-01T10:01:00.000Z',
    });

    const live = collector.buildLiveSnapshot();
    expect(live.summary).toContain('Voorraad');
    expect(live.flowGraph?.nodes.length).toBeGreaterThan(2);
  });
});
