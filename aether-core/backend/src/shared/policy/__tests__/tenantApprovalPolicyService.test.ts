import {
  assessApprovalAutoEligible,
  getTenantApprovalPolicy,
  setTenantApprovalPolicy,
} from '../tenantApprovalPolicyService';

describe('tenantApprovalPolicyService', () => {
  beforeEach(() => {
    setTenantApprovalPolicy('tenant_test', {
      autoApproveLowRisk: true,
      autoApproveMediumRiskMail: false,
      maxAutoPriceChangePct: 5,
      enabled: true,
    });
  });

  it('returns default policy for unknown tenant', () => {
    const policy = getTenantApprovalPolicy('unknown_tenant_xyz');
    expect(policy.enabled).toBe(true);
    expect(policy.autoApproveLowRisk).toBe(true);
  });

  it('marks safe medium-risk mail as auto-eligible when mail policy enabled', () => {
    setTenantApprovalPolicy('tenant_test', { autoApproveMediumRiskMail: true });
    const result = assessApprovalAutoEligible({
      tenantId: 'tenant_test',
      module: 'aether-mail',
      actionType: 'auto_reply',
      payload: { category: 'faq' },
    });
    expect(result.eligible).toBe(true);
    expect(result.riskClass).toBe('medium');
  });

  it('marks unlisted actions as low-risk auto-eligible', () => {
    const result = assessApprovalAutoEligible({
      tenantId: 'tenant_test',
      module: 'inventory-pricing',
      actionType: 'stock_sync',
      payload: {},
    });
    expect(result.eligible).toBe(true);
    expect(result.riskClass).toBe('low');
  });

  it('blocks auto-approve when disabled', () => {
    setTenantApprovalPolicy('tenant_test', { enabled: false });
    const result = assessApprovalAutoEligible({
      tenantId: 'tenant_test',
      module: 'aether-mail',
      actionType: 'auto_reply',
      payload: {},
    });
    expect(result.eligible).toBe(false);
  });

  it('blocks high-risk refunds', () => {
    const result = assessApprovalAutoEligible({
      tenantId: 'tenant_test',
      module: 'payment-fulfillment',
      actionType: 'refund',
      payload: { amount: 500 },
    });
    expect(result.eligible).toBe(false);
    expect(result.riskClass).toBe('high');
  });
});
