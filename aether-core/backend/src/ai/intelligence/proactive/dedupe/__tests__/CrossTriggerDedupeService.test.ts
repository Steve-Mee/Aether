import type { ProactiveFinding } from '../../ProactiveTriggerDefinition';
import { CrossTriggerDedupeService } from '../CrossTriggerDedupeService';

jest.mock('../../proactiveConfig', () => ({
  isProactiveCrossDedupeEnabled: jest.fn(() => true),
}));

const baseFinding = (overrides: Partial<ProactiveFinding>): ProactiveFinding => ({
  triggerId: 'inventory.low_stock',
  dedupeKey: 'test',
  agentKey: 'inventory',
  title: 'Low stock',
  command: 'Check stock',
  intentId: 'RESTOCK_SUGGEST',
  category: 'voorraad',
  riskLevel: 'low',
  executionMode: 'autonomous',
  priority: 8,
  evidence: {},
  ...overrides,
});

describe('CrossTriggerDedupeService', () => {
  const service = new CrossTriggerDedupeService();

  it('merges inventory and margin when product overlap exists', () => {
    const inventory = baseFinding({
      triggerId: 'inventory.low_stock',
      evidence: {
        lowStockCount: 2,
        lowStockSkus: [{ productId: 'p1' }, { productId: 'p2' }],
      },
    });
    const margin = baseFinding({
      triggerId: 'pricing.margin_decline',
      agentKey: 'pricing',
      category: 'marge',
      priority: 7,
      evidence: { lowMarginCount: 3, productIds: ['p1'] },
    });

    const result = service.normalize([inventory, margin]);
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toContain('Voorraad én marge');
    expect(result[0]?.clusterKey).toMatch(/^cluster:stock_margin:/);
    expect(result[0]?.evidence.mergedTriggers).toEqual([
      'inventory.low_stock',
      'pricing.margin_decline',
    ]);
  });

  it('suppresses margin when supplier price drop shares supplier context', () => {
    const supplier = baseFinding({
      triggerId: 'supplier.price_drop',
      agentKey: 'supplier',
      category: 'leverancier',
      priority: 9,
      evidence: { supplierId: 'sup-1', dropPct: 8 },
    });
    const margin = baseFinding({
      triggerId: 'pricing.margin_decline',
      agentKey: 'pricing',
      category: 'marge',
      priority: 6,
      evidence: { lowMarginCount: 2 },
    });

    const result = service.normalize([supplier, margin]);
    expect(result).toHaveLength(1);
    expect(result[0]?.triggerId).toBe('supplier.price_drop');
    expect(result[0]?.clusterKey).toMatch(/^cluster:supplier:sup-1:/);
  });

  it('does not merge unrelated triggers', () => {
    const order = baseFinding({
      triggerId: 'general.order_anomaly',
      agentKey: 'general',
      category: 'algemeen',
      evidence: { anomalyPct: 30 },
    });
    const inventory = baseFinding({
      triggerId: 'inventory.low_stock',
      evidence: { lowStockSkus: [{ productId: 'p99' }] },
    });

    const result = service.normalize([order, inventory]);
    expect(result).toHaveLength(2);
  });

  it('mergeActive keeps highest priority per clusterKey', () => {
    const records = [
      { id: 'a', clusterKey: 'cluster:x', priority: 5 },
      { id: 'b', clusterKey: 'cluster:x', priority: 9 },
      { id: 'c', clusterKey: null, priority: 3 },
    ];
    const merged = service.mergeActive(records);
    expect(merged.map((r) => r.id)).toEqual(['b', 'c']);
  });
});
