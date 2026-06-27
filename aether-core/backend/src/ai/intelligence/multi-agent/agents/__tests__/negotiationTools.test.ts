import { listActiveNegotiationsTool, getNegotiationDetailTool } from '../negotiationTools';

describe('negotiationTools', () => {
  const adminData = {
    listActiveNegotiations: jest.fn().mockResolvedValue([
      { id: 'n1', status: 'IN_PROGRESS', productId: 'p1', currentOffer: 99, customerAgentId: 'c1', merchantAgentId: 'm1' },
    ]),
    getNegotiationDetail: jest.fn().mockResolvedValue({
      id: 'n1',
      status: 'IN_PROGRESS',
      productId: 'p1',
      currentOffer: 99,
      customerAgentId: 'c1',
      merchantAgentId: 'm1',
      offers: [{ price: 95, status: 'pending' }],
    }),
  };

  it('listActiveNegotiations returns negotiations', async () => {
    const tool = listActiveNegotiationsTool({ adminData: adminData as never });
    const result = await tool.executeRead!({ tenantId: 't1' }, {});
    expect(result).toMatchObject({ success: true, count: 1 });
  });

  it('getNegotiationDetail returns detail', async () => {
    const tool = getNegotiationDetailTool({ adminData: adminData as never });
    const result = await tool.executeRead!({ tenantId: 't1' }, { negotiationId: 'n1' });
    expect(result).toMatchObject({ success: true });
  });
});
