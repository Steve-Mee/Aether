import {
  createPromotionTool,
  suggestPromotionTool,
  suggestClearancePricingTool,
} from '../promotionTools';

describe('createPromotionTool (P12)', () => {
  it('executeConfirmed persists draft via CreatePromotionUseCase', async () => {
    const execute = jest.fn().mockResolvedValue({
      status: 'partial',
      promotion: { id: 'promo_ai_1', name: 'AI Campaign', status: 'draft' },
    });
    const tool = createPromotionTool({ createPromotion: { execute } as never });
    expect(tool.executeConfirmed).toBeDefined();

    const result = await tool.executeConfirmed!(
      { tenantId: 'tenant_a', actorId: 'actor_1' },
      { name: 'AI Campaign', discountPct: 12, productIds: ['p1'] }
    );

    expect(result.success).toBe(true);
    expect(execute).toHaveBeenCalledWith(
      'tenant_a',
      expect.objectContaining({
        name: 'AI Campaign',
        type: 'percent',
        value: 12,
        status: 'draft',
        configJson: expect.objectContaining({ productIds: ['p1'], source: 'createPromotion' }),
      })
    );
    expect(result.operationalMeta).toEqual(
      expect.objectContaining({ promotionId: 'promo_ai_1' })
    );
  });

  it('executeConfirmed fails without name', async () => {
    const tool = createPromotionTool({
      createPromotion: { execute: jest.fn() } as never,
    });
    const result = await tool.executeConfirmed!({ tenantId: 'tenant_a' }, { discountPct: 5 });
    expect(result.success).toBe(false);
  });

  it('executeConfirmed fails when CreatePromotionUseCase unavailable', async () => {
    const tool = createPromotionTool();
    const result = await tool.executeConfirmed!(
      { tenantId: 'tenant_a' },
      { name: 'Campaign', discountPct: 5 }
    );
    expect(result.success).toBe(false);
  });
});

describe('suggestPromotionTool', () => {
  it('executeConfirmed persists draft via CreatePromotionUseCase', async () => {
    const execute = jest.fn().mockResolvedValue({
      status: 'partial',
      promotion: { id: 'promo_suggest_1', name: 'Summer sale', status: 'draft' },
    });
    const tool = suggestPromotionTool({ adminData: {} as never, createPromotion: { execute } as never });
    const result = await tool.executeConfirmed!(
      { tenantId: 'tenant_a' },
      { productIds: ['p1'], discountPct: 15, reason: 'Summer sale' }
    );
    expect(result.success).toBe(true);
    expect(execute).toHaveBeenCalledWith(
      'tenant_a',
      expect.objectContaining({ name: 'Summer sale', value: 15, status: 'draft' })
    );
    expect(result.operationalMeta).toEqual(
      expect.objectContaining({ promotionId: 'promo_suggest_1' })
    );
  });
});

describe('suggestClearancePricingTool', () => {
  it('executeConfirmed fails without productId', async () => {
    const tool = suggestClearancePricingTool({
      adminData: {} as never,
      createPromotion: { execute: jest.fn() } as never,
    });
    const result = await tool.executeConfirmed!({ tenantId: 'tenant_a' }, { markdownPct: 20 });
    expect(result.success).toBe(false);
  });
});
