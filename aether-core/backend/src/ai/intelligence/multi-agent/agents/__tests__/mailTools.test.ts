import { getEmailSummaryTool } from '../mailTools';

describe('mailTools', () => {
  const adminData = {
    countEmailsByStatus: jest
      .fn()
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(7),
  };

  it('getEmailSummary returns mail counts', async () => {
    const tool = getEmailSummaryTool({ adminData: adminData as never });
    const result = await tool.executeRead!({ tenantId: 't1' }, {});
    expect(result).toMatchObject({ success: true, awaitingAction: 3, autoReplied: 7 });
  });
});
