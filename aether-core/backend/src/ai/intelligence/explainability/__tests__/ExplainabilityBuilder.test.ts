import { ExplainabilityBuilder, evidenceToDataSources } from '../ExplainabilityBuilder';
import type { ExplainabilityBuildContext } from '../types';

describe('ExplainabilityBuilder', () => {
  const baseCtx: ExplainabilityBuildContext = {
    agents: [
      {
        agentKey: 'inventory',
        role: 'specialist',
        label: 'Voorraad-agent',
        contribution: '12 low-stock SKU\'s gevonden',
      },
      {
        agentKey: 'pricing',
        role: 'specialist',
        label: 'Prijs-agent',
      },
    ],
    dataSources: evidenceToDataSources({ lowStockCount: 12 }),
    reasoningSteps: [{ label: 'Signaal gedetecteerd' }],
    reflections: [],
    handoffChain: [],
    policyNotes: [],
  };

  it('builds NL summary for multiple agents', () => {
    const { payload } = new ExplainabilityBuilder().build(baseCtx, 'simple');
    expect(payload.summary).toContain('Voorraad-agent');
    expect(payload.summary).toContain('Prijs-agent');
  });

  it('strips previews in simple mode', () => {
    const ctx: ExplainabilityBuildContext = {
      ...baseCtx,
      dataSources: [
        { kind: 'rag', label: 'Fragment', preview: 'secret detail', score: 0.9 },
      ],
    };
    const { payload, persistLevel } = new ExplainabilityBuilder().build(ctx, 'simple');
    expect(persistLevel).toBe('simple');
    expect(payload.dataSources[0]?.preview).toBeUndefined();
    expect(payload.reflections).toHaveLength(0);
  });

  it('keeps extended payload including previews', () => {
    const ctx: ExplainabilityBuildContext = {
      ...baseCtx,
      dataSources: [
        { kind: 'rag', label: 'Fragment', preview: 'detail text', score: 0.9 },
      ],
      reflections: [{ observation: 'Check margin' }],
    };
    const { payload, persistLevel } = new ExplainabilityBuilder().build(ctx, 'extended');
    expect(persistLevel).toBe('extended');
    expect(payload.dataSources[0]?.preview).toBeDefined();
    expect(payload.reflections).toHaveLength(1);
  });

  it('builds minimal payload when detail level is off', () => {
    const { payload, persistLevel } = new ExplainabilityBuilder().build(baseCtx, 'off');
    expect(persistLevel).toBe('minimal');
    expect(payload.dataSources).toHaveLength(0);
    expect(payload.agents).toHaveLength(2);
  });

  it('builds proactive evidence from trigger metadata', () => {
    const { payload } = ExplainabilityBuilder.buildFromProactiveEvidence({
      triggerId: 'inventory.low_stock',
      agentKey: 'inventory',
      title: 'Low stock alert',
      evidence: { lowStockCount: 5 },
      userPref: 'simple',
    });
    expect(payload.summary).toContain('Voorraad-agent');
    expect(payload.dataSources.some((d) => d.label.includes('5'))).toBe(true);
  });
});

describe('evidenceToDataSources', () => {
  it('maps known evidence fields', () => {
    const sources = evidenceToDataSources({
      lowStockCount: 3,
      changePercent: 10,
      triggerId: 'pricing.drop',
    });
    expect(sources.length).toBeGreaterThanOrEqual(2);
  });
});
