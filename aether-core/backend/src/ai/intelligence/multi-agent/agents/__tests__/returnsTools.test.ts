import {
  analyzeReturnPatternsTool,
  signalSupplierQualityIssuesTool,
  suggestReturnReductionTool,
} from '../returnsTools';

jest.mock('../../../../../shared/prisma/client', () => ({
  prisma: {
    insight: {
      create: jest.fn().mockResolvedValue({ id: 'insight_1' }),
    },
  },
}));

jest.mock('../../../../../shared/approval/approvalService', () => ({
  createApproval: jest.fn().mockResolvedValue({ id: 'appr_return_1', status: 'pending' }),
}));

jest.mock('../../../../../shared/audit/auditService', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

function mockAdminData(overrides: Record<string, unknown> = {}) {
  return {
    getOrderTrends: jest.fn().mockResolvedValue({
      recentCount: 100,
      priorCount: 90,
      trendPct: 11,
      statusBreakdown: { delivered: 85, returned: 8, refunded: 4, cancelled: 3 },
    }),
    listRecentOrdersDetailed: jest.fn().mockResolvedValue([
      { id: 'o1', status: 'returned', total: 10, customerId: 'c1' },
      { id: 'o2', status: 'delivered', total: 20, customerId: 'c2' },
      { id: 'o3', status: 'refunded', total: 15, customerId: 'c3' },
    ]),
    listSuppliers: jest.fn().mockResolvedValue([{ id: 's1' }, { id: 's2' }]),
    ...overrides,
  };
}

describe('returnsTools', () => {
  it('analyzeReturnPatterns computes return rate from status breakdown', async () => {
    const adminData = mockAdminData();
    const tool = analyzeReturnPatternsTool({ adminData: adminData as never });
    const result = (await tool.executeRead!({ tenantId: 't1' }, {})) as Record<string, unknown>;
    expect(result.success).toBe(true);
    expect(result.returnRatePct).toBe(15);
    expect(result.riskLevel).toBe('high');
  });

  it('signalSupplierQualityIssues flags when above threshold', async () => {
    const adminData = mockAdminData();
    const tool = signalSupplierQualityIssuesTool({ adminData: adminData as never });
    const result = (await tool.executeRead!({ tenantId: 't1' }, { thresholdPct: 8 })) as Record<
      string,
      unknown
    > & { signals: Array<{ suggestedDelegate: string }> };
    expect(result.flagged).toBe(true);
    expect(result.signals).toHaveLength(1);
    expect(result.signals[0].suggestedDelegate).toBe('supplier');
  });

  it('suggestReturnReduction builds proposal with actions', async () => {
    const adminData = mockAdminData();
    const tool = suggestReturnReductionTool({ adminData: adminData as never });
    const proposal = await tool.buildProposal!({ tenantId: 't1' }, { focus: 'listing' });
    expect(proposal.tool).toBe('suggestReturnReduction');
    expect(proposal.payload.suggestedActions).toContain('improve_size_fit_copy');
    expect(proposal.payload.focus).toBe('listing');
  });

  it('executeConfirmed persists insight and creates approval when rate is high', async () => {
    const adminData = mockAdminData();
    const tool = suggestReturnReductionTool({ adminData: adminData as never });
    const { prisma } = require('../../../../../shared/prisma/client');
    const { createApproval } = require('../../../../../shared/approval/approvalService');

    const result = await tool.executeConfirmed!(
      { tenantId: 't1', actorId: 'merchant_1' },
      {
        focus: 'quality',
        returnRatePct: 15,
        suggestedActions: ['audit_top_returned_skus'],
      }
    );

    expect(result.success).toBe(true);
    expect(prisma.insight.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: 't1', type: 'returns-quality' }),
      })
    );
    expect(createApproval).toHaveBeenCalled();
    expect(result.operationalMeta).toEqual(
      expect.objectContaining({ insightId: 'insight_1', approvalId: 'appr_return_1' })
    );
  });
});
