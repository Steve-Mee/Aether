import { ShortTermMemoryStore } from '../ShortTermMemoryStore';
import { createInMemoryIntelligenceLayer } from '../../../createIntelligenceLayer';

describe('ShortTermMemoryStore', () => {
  const layer = createInMemoryIntelligenceLayer();
  const store = new ShortTermMemoryStore(layer.personalBrainRegistry);

  it('appends entries and trims to ring buffer limit', async () => {
    process.env.PERSONAL_BRAIN_MEMORY_SHORT_TERM_LIMIT = '3';
    await store.clear('tenant_stm');

    for (let i = 0; i < 5; i++) {
      await store.append('tenant_stm', {
        command: `cmd ${i}`,
        intent: 'PRICE_UPDATE',
        outcome: `result ${i}`,
        timestamp: new Date().toISOString(),
        success: true,
      });
    }

    const entries = await store.list('tenant_stm');
    expect(entries).toHaveLength(3);
    expect(entries[0].command).toBe('cmd 2');
    expect(entries[2].command).toBe('cmd 4');
    delete process.env.PERSONAL_BRAIN_MEMORY_SHORT_TERM_LIMIT;
  });

  it('isolates tenants', async () => {
    await store.clear('tenant_a');
    await store.clear('tenant_b');
    await store.append('tenant_a', {
      command: 'a',
      intent: 'X',
      outcome: 'a',
      timestamp: new Date().toISOString(),
      success: true,
    });
    expect(await store.list('tenant_b')).toHaveLength(0);
    expect(await store.list('tenant_a')).toHaveLength(1);
  });

  it('scores query relevance', async () => {
    await store.clear('tenant_score');
    await store.append('tenant_score', {
      command: 'Verhoog prijzen voor sneakers',
      intent: 'PRICE_UPDATE',
      outcome: 'Prijzen verhoogd met 5%',
      timestamp: new Date().toISOString(),
      success: true,
    });
    await store.append('tenant_score', {
      command: 'Toon email samenvatting',
      intent: 'EMAIL_SUMMARY',
      outcome: '3 open mails',
      timestamp: new Date().toISOString(),
      success: true,
    });

    const scored = store.scoreForQuery(await store.list('tenant_score'), 'prijzen sneakers verhogen');
    expect(scored.length).toBeGreaterThan(0);
    expect(scored[0].entry.intent).toBe('PRICE_UPDATE');
  });
});
