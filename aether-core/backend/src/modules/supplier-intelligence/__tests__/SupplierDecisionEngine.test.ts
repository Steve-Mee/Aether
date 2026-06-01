import { supplierDecisionEngine, SupplierDecisionEngine } from '../application/services/SupplierDecisionEngine';

describe('SupplierDecisionEngine', () => {
  const engine = new SupplierDecisionEngine();

  it('requires approval for new products', () => {
    const d = engine.decide({ changeType: 'new_product' });
    expect(d.action).toBe('approval_required');
    expect(d.requiresApproval).toBe(true);
  });

  it('negotiates on 15-24% price change', () => {
    const d = engine.decide({ changeType: 'price_change', changePercent: 18 });
    expect(d.action).toBe('negotiate');
  });

  it('holds on 10-14% price change', () => {
    const d = engine.decide({ changeType: 'price_change', changePercent: 12 });
    expect(d.action).toBe('hold');
  });

  it('requires approval above 25%', () => {
    const d = engine.decide({ changeType: 'price_change', changePercent: 30 });
    expect(d.action).toBe('approval_required');
  });

  it('exports singleton', () => {
    expect(supplierDecisionEngine).toBeInstanceOf(SupplierDecisionEngine);
  });
});
