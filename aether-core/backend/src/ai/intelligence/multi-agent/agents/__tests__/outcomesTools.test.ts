import { getOutcomesSummaryTool, getLatestProposedOutcomeTool } from '../outcomesTools';

jest.mock('../../../../attribution/OutcomeEngine', () => ({
  computeIncrementalRevenueUplift: jest.fn().mockResolvedValue(120.5),
}));

describe('outcomesTools', () => {
  const adminData = {
    countOutcomesByStatus: jest.fn().mockResolvedValue(2),
    findLatestProposedOutcome: jest.fn().mockResolvedValue({
      id: 'o1',
      metric: 'revenue',
      confidence: 0.8,
    }),
  };

  it('getOutcomesSummary returns uplift', async () => {
    const tool = getOutcomesSummaryTool({ adminData: adminData as never });
    const result = await tool.executeRead!({ tenantId: 't1' }, {});
    expect(result).toMatchObject({ success: true, billableCount: 2 });
  });

  it('getLatestProposedOutcome returns outcome', async () => {
    const tool = getLatestProposedOutcomeTool({ adminData: adminData as never });
    const result = await tool.executeRead!({ tenantId: 't1' }, {});
    expect(result).toMatchObject({ success: true, found: true });
  });
});
