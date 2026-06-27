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
