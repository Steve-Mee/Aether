import { buildPatternKey, anonymizeSummaryTemplate } from '../global/ExplainabilityPatternContributionService';
import { meetsKAnonymity } from '../../global-knowledge/federated/privacyUtils';

describe('ExplainabilityPatternContributionService helpers', () => {
  it('builds stable pattern keys', () => {
    const a = buildPatternKey({
      agentKeys: ['pricing', 'inventory'],
      triggerId: 'low_stock',
      intentId: null,
      sourceType: 'command',
    });
    const b = buildPatternKey({
      agentKeys: ['inventory', 'pricing'],
      triggerId: 'low_stock',
      intentId: null,
      sourceType: 'command',
    });
    expect(a).toBe(b);
    expect(a).toHaveLength(32);
  });

  it('anonymizes merchant-specific summary fragments', () => {
    const out = anonymizeSummaryTemplate('Acme had 12 SKUs at 15% margin for €1.234,50');
    expect(out).not.toMatch(/12 SKU/i);
    expect(out).not.toMatch(/15%/);
    expect(out).not.toMatch(/€1/);
    expect(out).toContain('€X');
  });

  it('requires k-anonymity before publish threshold', () => {
    expect(meetsKAnonymity(1, 1)).toBe(false);
    expect(meetsKAnonymity(5, 10)).toBe(true);
  });
});
