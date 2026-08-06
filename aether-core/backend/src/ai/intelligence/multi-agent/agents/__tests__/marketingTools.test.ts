import {
  detectMarketingOpportunitiesTool,
  suggestBundleTool,
  suggestCampaignChannelTool,
} from '../promotionTools';

function mockAdminData() {
  return {
    listLowStockInventory: jest.fn().mockResolvedValue([
      { id: 'i1', productId: 'p1', quantity: 2, warehouseId: 'w1' },
      { id: 'i2', productId: 'p2', quantity: 1, warehouseId: 'w1' },
    ]),
    getMarginMetrics: jest.fn().mockResolvedValue({
      lowMarginCount: 3,
      totalProducts: 20,
      marginPct: 22,
    }),
    getOrderTrends: jest.fn().mockResolvedValue({
      recentCount: 40,
      priorCount: 60,
      trendPct: -20,
      statusBreakdown: { delivered: 40 },
    }),
  };
}

describe('marketing enhance tools', () => {
  it('detectMarketingOpportunities surfaces clearance and demand signals', async () => {
    const tool = detectMarketingOpportunitiesTool({ adminData: mockAdminData() as never });
    const result = (await tool.executeRead!({ tenantId: 't1' }, {})) as Record<string, unknown> & {
      opportunities: Array<{ type: string }>;
    };
    expect(result.success).toBe(true);
    const types = result.opportunities.map((o) => o.type);
    expect(types).toContain('clearance');
    expect(types).toContain('demand_stimulus');
  });

  it('suggestBundle builds proposal from low-stock when no productIds', async () => {
    const tool = suggestBundleTool({ adminData: mockAdminData() as never });
    const proposal = await tool.buildProposal!({ tenantId: 't1' }, {});
    expect(proposal.tool).toBe('suggestBundle');
    expect(Array.isArray(proposal.payload.productIds)).toBe(true);
    expect((proposal.payload.productIds as string[]).length).toBeGreaterThan(0);
  });

  it('suggestCampaignChannel flags deep discounts as high risk', async () => {
    const tool = suggestCampaignChannelTool({ adminData: mockAdminData() as never });
    const proposal = await tool.buildProposal!(
      { tenantId: 't1' },
      { channel: 'email', discountPct: 40, theme: 'clearance' }
    );
    expect(proposal.tool).toBe('suggestCampaignChannel');
    expect(proposal.requiresApproval).toBe(true);
  });
});
