import { getInventoryStatusTool, listLowStockTool, suggestRestockTool } from '../inventoryTools';

describe('inventoryTools', () => {
  const adminData = {
    listInventoryItems: jest.fn().mockResolvedValue([
      { quantity: 5 },
      { quantity: 20 },
    ]),
    listLowStockInventory: jest.fn().mockResolvedValue([
      { id: '1', productId: 'p1', quantity: 2, warehouseId: 'w1' },
    ]),
    applyRestockUpdates: jest.fn().mockResolvedValue(1),
  };

  it('getInventoryStatus returns SKU summary', async () => {
    const tool = getInventoryStatusTool({ adminData: adminData as never });
    const result = await tool.executeRead!({ tenantId: 't1' }, {});
    expect(result).toMatchObject({ success: true, totalSkus: 2, lowStockCount: 1 });
  });

  it('listLowStock returns low stock items', async () => {
    const tool = listLowStockTool({ adminData: adminData as never });
    const result = await tool.executeRead!({ tenantId: 't1' }, { threshold: 10 });
    expect(result).toMatchObject({ success: true, count: 1 });
  });

  it('suggestRestock builds proposal from low stock', async () => {
    const tool = suggestRestockTool({ adminData: adminData as never });
    const proposal = await tool.buildProposal!({ tenantId: 't1' }, { threshold: 10 });
    expect(proposal?.tool).toBe('suggestRestock');
    expect(proposal?.requiresApproval).toBe(false);
    expect((proposal?.payload as { items: unknown[] }).items.length).toBeGreaterThan(0);
  });

  it('suggestRestock executeConfirmed applies updates', async () => {
    const tool = suggestRestockTool({ adminData: adminData as never });
    const result = await tool.executeConfirmed!(
      { tenantId: 't1' },
      {
        items: [{ id: '1', productId: 'p1', warehouseId: 'w1', currentQty: 2, suggestedQty: 20 }],
      }
    );
    expect(result).toMatchObject({ success: true, updated: 1 });
    expect(adminData.applyRestockUpdates).toHaveBeenCalled();
  });
});
