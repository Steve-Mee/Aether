import { createInMemoryIntelligenceLayer } from '../../createIntelligenceLayer';

describe('PersonalBrain', () => {
  it('recalls remembered interactions for the same tenant', async () => {
    const layer = createInMemoryIntelligenceLayer();
    const brain = layer.personalBrainRegistry.get('tenant_alpha');

    await brain.remember({
      command: 'monitor supplier acme',
      intent: 'SUPPLIER_MONITOR',
      result: 'Monitoring started',
    });

    const recall = await brain.recall('supplier acme monitor');
    expect(recall.snippets.length).toBeGreaterThan(0);
    expect(recall.snippets[0]).toContain('SUPPLIER_MONITOR');
  });

  it('does not leak memory across tenants', async () => {
    const layer = createInMemoryIntelligenceLayer();
    const brainA = layer.personalBrainRegistry.get('tenant_a');
    const brainB = layer.personalBrainRegistry.get('tenant_b');

    await brainA.remember({
      command: 'secret tenant a command',
      intent: 'PRICE_UPDATE',
      result: 'done',
    });

    const recallB = await brainB.recall('secret tenant a command');
    expect(recallB.snippets).toHaveLength(0);
  });

  it('persists agent state updates', async () => {
    const layer = createInMemoryIntelligenceLayer();
    const brain = layer.personalBrainRegistry.get('tenant_state');

    await brain.updateAgentState({ lastIntent: 'FORECAST' });
    const ctx = await brain.getContext();
    expect(ctx.lastIntent).toBe('FORECAST');
    expect(ctx.loraAdapterId).toContain('lora-');
  });
});

describe('PersonalBrainRegistry', () => {
  it('returns cached instance per tenantId and agentKey', () => {
    const layer = createInMemoryIntelligenceLayer();
    const a = layer.personalBrainRegistry.get('t1', 'admin');
    const b = layer.personalBrainRegistry.get('t1', 'admin');
    const mail = layer.personalBrainRegistry.get('t1', 'mail');
    expect(a).toBe(b);
    expect(a).not.toBe(mail);
  });
});
