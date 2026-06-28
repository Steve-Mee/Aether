import { summarizeApprovalsByModuleTool, listPendingApprovalsTool } from '../approvalTools';

describe('approvalTools', () => {
  const adminData = {
    listPendingApprovals: jest.fn().mockResolvedValue([
      { id: 'a1', payload: '{"riskLevel":"low"}', module: 'aether-mail' },
    ]),
    countPendingApprovals: jest.fn().mockResolvedValue(1),
    approveLowRisk: jest.fn().mockResolvedValue(1),
  };

  it('summarizeApprovalsByModule groups by module', async () => {
    const tool = summarizeApprovalsByModuleTool({ adminData: adminData as never });
    const result = await tool.executeRead!({ tenantId: 't1' }, {});
    expect(result).toMatchObject({ success: true, totalPending: 1 });
  });

  it('listPendingApprovals returns items', async () => {
    const tool = listPendingApprovalsTool({ adminData: adminData as never });
    const result = await tool.executeRead!({ tenantId: 't1' }, {});
    expect(result).toMatchObject({ success: true, count: 1 });
  });
});
