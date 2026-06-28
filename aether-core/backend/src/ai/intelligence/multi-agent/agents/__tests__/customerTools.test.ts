import {
  getCustomerOverviewTool,
  getTopCustomersTool,
  getOrderTrendsTool,
  getRecentOrdersTool,
  getCustomerSegmentsTool,
  getChurnSignalsTool,
} from '../customerTools';

describe('customerTools', () => {
  const adminData = {
    countCustomers: jest.fn().mockResolvedValue(42),
    getTopCustomers: jest.fn().mockResolvedValue([
      { id: 'c1', email: 'a@shop.com', name: 'Alice', orderCount: 5, totalSpent: 250 },
    ]),
    getOrderTrends: jest.fn().mockResolvedValue({
      recentCount: 15,
      priorCount: 10,
      trendPct: 50,
      statusBreakdown: { completed: 12, pending: 3 },
    }),
    getCustomerSegments: jest.fn().mockResolvedValue({
      vip: 2,
      atRisk: 3,
      new: 1,
      regular: 10,
      total: 16,
      segments: [],
    }),
    getChurnSignals: jest.fn().mockResolvedValue({
      atRiskCount: 3,
      decliningTrend: true,
      trendPct: -20,
      cancelledOrRefundedRatio: 5,
      recentOrderCount: 10,
      priorOrderCount: 15,
      atRiskCustomers: [],
      suggestedActions: ['outreach_campaign'],
    }),
    listRecentOrdersDetailed: jest.fn().mockResolvedValue([
      { id: 'o1', status: 'pending', total: 50, customerId: 'c1' },
    ]),
  };

  it('getCustomerOverview returns count and trends', async () => {
    const tool = getCustomerOverviewTool({ adminData: adminData as never });
    const result = await tool.executeRead!({ tenantId: 't1' }, {});
    expect(result).toMatchObject({
      success: true,
      customerCount: 42,
      orderTrends: { recentCount: 15, trendPct: 50 },
    });
    expect(adminData.countCustomers).toHaveBeenCalledWith('t1');
  });

  it('getTopCustomers returns ranked customers', async () => {
    const tool = getTopCustomersTool({ adminData: adminData as never });
    const result = await tool.executeRead!({ tenantId: 't1' }, { limit: 5 });
    expect(result).toMatchObject({ success: true, count: 1 });
    expect((result as { customers: unknown[] }).customers).toHaveLength(1);
  });

  it('getOrderTrends returns demand signal', async () => {
    const tool = getOrderTrendsTool({ adminData: adminData as never });
    const result = await tool.executeRead!({ tenantId: 't1' }, { days: 30 });
    expect(result).toMatchObject({
      success: true,
      demandSignal: 'growing',
      recentCount: 15,
    });
  });

  it('getOrderTrends flags declining demand', async () => {
    adminData.getOrderTrends.mockResolvedValueOnce({
      recentCount: 5,
      priorCount: 20,
      trendPct: -75,
      statusBreakdown: { completed: 5 },
    });
    const tool = getOrderTrendsTool({ adminData: adminData as never });
    const result = await tool.executeRead!({ tenantId: 't1' }, {});
    expect(result).toMatchObject({ demandSignal: 'declining' });
    expect((result as { suggestedActions: string[] }).suggestedActions).toContain('review_pricing');
  });

  it('getRecentOrders returns status breakdown', async () => {
    const tool = getRecentOrdersTool({ adminData: adminData as never });
    const result = await tool.executeRead!({ tenantId: 't1' }, { limit: 5 });
    expect(result).toMatchObject({ success: true, count: 1 });
    expect((result as { statusBreakdown: Record<string, number> }).statusBreakdown.pending).toBe(1);
  });

  it('getCustomerSegments returns segment summary', async () => {
    const tool = getCustomerSegmentsTool({ adminData: adminData as never });
    const result = await tool.executeRead!({ tenantId: 't1' }, {});
    expect(result).toMatchObject({ success: true, vip: 2, atRisk: 3, total: 16 });
  });

  it('getChurnSignals flags churn risk', async () => {
    const tool = getChurnSignalsTool({ adminData: adminData as never });
    const result = await tool.executeRead!({ tenantId: 't1' }, {});
    expect(result).toMatchObject({ success: true, churnRisk: true, atRiskCount: 3 });
  });
});
