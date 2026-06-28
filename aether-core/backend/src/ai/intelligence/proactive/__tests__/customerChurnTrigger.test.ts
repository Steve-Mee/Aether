import { customerChurnTrigger } from '../triggers/customerChurnTrigger';

describe('customerChurnTrigger', () => {
  const adminData = {
    getChurnSignals: jest.fn(),
  };

  it('returns empty when churn risk is low', async () => {
    adminData.getChurnSignals.mockResolvedValue({
      atRiskCount: 1,
      decliningTrend: false,
      trendPct: 5,
      cancelledOrRefundedRatio: 2,
      recentOrderCount: 10,
      priorOrderCount: 9,
      atRiskCustomers: [],
      suggestedActions: [],
    });
    const findings = await customerChurnTrigger.evaluate!({
      tenantId: 't1',
      adminData: adminData as never,
    });
    expect(findings).toHaveLength(0);
  });

  it('emits finding when at-risk count exceeds threshold', async () => {
    adminData.getChurnSignals.mockResolvedValue({
      atRiskCount: 5,
      decliningTrend: false,
      trendPct: -5,
      cancelledOrRefundedRatio: 2,
      recentOrderCount: 10,
      priorOrderCount: 11,
      atRiskCustomers: [{ id: 'c1', email: 'a@x.com', name: 'A', daysSinceLastOrder: 90 }],
      suggestedActions: ['outreach_campaign'],
    });
    const findings = await customerChurnTrigger.evaluate!({
      tenantId: 't1',
      adminData: adminData as never,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      triggerId: 'customer.churn_risk',
      agentKey: 'customer',
      intentId: 'CUSTOMER_CHURN_SIGNALS',
    });
  });
});
