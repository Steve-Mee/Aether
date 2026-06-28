import {
  listProductsTool,
  searchCatalogProductsTool,
  proposeCreateProductTool,
} from '../catalogTools';

describe('catalogTools', () => {
  const adminData = {
    listProductsForBrain: jest.fn().mockResolvedValue([
      { id: 'p1', name: 'Widget', price: 10, stock: 5, slug: 'widget' },
    ]),
    searchProductsByName: jest.fn().mockResolvedValue([
      { id: 'p1', name: 'Widget', price: 10, stock: 5, slug: 'widget' },
    ]),
    createProduct: jest.fn().mockResolvedValue({ id: 'p2', name: 'Gadget', slug: 'gadget' }),
  };

  const ctx = { tenantId: 'tenant_1', actorId: 'user_1' };

  it('listProducts returns catalog overview', async () => {
    const tool = listProductsTool({ adminData: adminData as never });
    const result = await tool.executeRead!(ctx as never, { limit: 10 });
    expect(result).toMatchObject({ success: true, count: 1 });
    expect(adminData.listProductsForBrain).toHaveBeenCalledWith('tenant_1', 10);
  });

  it('searchCatalogProducts requires query', async () => {
    const tool = searchCatalogProductsTool({ adminData: adminData as never });
    expect(tool.validate!({})).toEqual({ ok: false, error: 'query is required' });
  });

  it('searchCatalogProducts searches by name', async () => {
    const tool = searchCatalogProductsTool({ adminData: adminData as never });
    const result = await tool.executeRead!(ctx as never, { query: 'Widget' });
    expect(result).toMatchObject({ success: true, query: 'Widget', count: 1 });
  });

  it('proposeCreateProduct builds proposal', async () => {
    const tool = proposeCreateProductTool({ adminData: adminData as never });
    const draft = await tool.buildProposal!(ctx as never, { name: 'Gadget', price: 25 });
    expect(draft.tool).toBe('proposeCreateProduct');
    expect(draft.payload).toMatchObject({ name: 'Gadget', slug: 'gadget', price: 25 });
  });

  it('proposeCreateProduct executes confirmed', async () => {
    const tool = proposeCreateProductTool({ adminData: adminData as never });
    const result = await tool.executeConfirmed!(ctx as never, {
      name: 'Gadget',
      slug: 'gadget',
      price: 25,
      stock: 10,
    });
    expect(result).toMatchObject({ success: true });
    expect(adminData.createProduct).toHaveBeenCalledWith('tenant_1', {
      name: 'Gadget',
      slug: 'gadget',
      description: undefined,
      price: 25,
      stock: 10,
    });
  });
});
