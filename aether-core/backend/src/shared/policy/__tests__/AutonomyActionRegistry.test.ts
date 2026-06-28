import { resolveAutonomyCategory, resolveAutonomyCategoryKey } from '../AutonomyActionRegistry';

describe('AutonomyActionRegistry', () => {
  it('maps brain tools to categories', () => {
    expect(resolveAutonomyCategoryKey({ tool: 'updatePrice' })).toBe('pricing');
    expect(resolveAutonomyCategoryKey({ tool: 'syncSupplier' })).toBe('supplier');
    expect(resolveAutonomyCategoryKey({ tool: 'suggestRestock' })).toBe('inventory');
  });

  it('maps intents to categories', () => {
    expect(resolveAutonomyCategory({ intent: 'PRICING_OPTIMIZE' })?.category).toBe('pricing');
    expect(resolveAutonomyCategory({ intent: 'PROMOTION_SUGGEST' })?.category).toBe('promotion');
  });

  it('maps workflow actions via module', () => {
    expect(
      resolveAutonomyCategoryKey({ module: 'aether-mail', actionType: 'reply' }),
    ).toBe('mail');
  });
});
