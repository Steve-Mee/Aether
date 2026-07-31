import { createPromotionTool } from '../promotionTools';

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
        configJson: { productIds: ['p1'] },
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
});
