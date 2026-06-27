import { createSupplierTool } from '../supplierTools';

describe('supplierTools', () => {
  const adminData = {
    createSupplier: jest.fn().mockResolvedValue({ id: 's1', name: 'Acme' }),
  };

  it('createSupplier builds proposal', async () => {
    const tool = createSupplierTool({ adminData: adminData as never });
    const draft = await tool.buildProposal!({ tenantId: 't1' }, { name: 'Acme', website: 'https://acme.com' });
    expect(draft.tool).toBe('createSupplier');
    expect(draft.summary).toContain('Acme');
  });

  it('createSupplier executes confirmed', async () => {
    const tool = createSupplierTool({ adminData: adminData as never });
    const result = await tool.executeConfirmed!(
      { tenantId: 't1' },
      { name: 'Acme', website: 'https://acme.com' }
    );
    expect(result.success).toBe(true);
    expect(adminData.createSupplier).toHaveBeenCalledWith('t1', 'Acme', 'https://acme.com');
  });
});

describe('getSupplierPriceIntelTool', () => {
  const adminData = {
    listSuppliers: jest.fn().mockResolvedValue([{ id: 'sup-1' }, { id: 'sup-2' }]),
    listProductsForBrain: jest.fn().mockResolvedValue([
      { id: 'p1', name: 'Widget', price: 100, stock: 10, slug: 'widget' },
      { id: 'p2', name: 'Gadget', price: 50, stock: 5, slug: 'gadget' },
    ]),
  };

  it('returns structured supplier price intel', async () => {
    const { getSupplierPriceIntelTool } = await import('../supplierTools');
    const tool = getSupplierPriceIntelTool({ adminData: adminData as never });
    const result = (await tool.executeRead!({ tenantId: 't1' }, {})) as {
      success: boolean;
      supplierCount: number;
      recentChanges: unknown[];
      suggestedPricingActions: unknown;
    };
    expect(result.success).toBe(true);
    expect(result.supplierCount).toBe(2);
    expect(result.recentChanges).toHaveLength(2);
    expect(result.suggestedPricingActions).toBeDefined();
  });
});
