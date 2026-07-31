import {
  resolveDelegationTarget,
  isMultiAgentDelegationEnabled,
  shouldSkipHandlerForSpecialist,
  getAllowedDelegationTargets,
} from '../delegationConfig';

describe('delegationConfig', () => {
  const prevEnv = process.env.MULTI_AGENT_DELEGATION_ENABLED;

  afterEach(() => {
    process.env.MULTI_AGENT_DELEGATION_ENABLED = prevEnv;
  });

  it('resolves mail intent to mail agent when enabled', () => {
    process.env.MULTI_AGENT_DELEGATION_ENABLED = 'true';
    expect(isMultiAgentDelegationEnabled()).toBe(true);
    expect(resolveDelegationTarget('EMAIL_SUMMARY')).toBe('mail');
    expect(resolveDelegationTarget('SUPPLIER_MONITOR')).toBe('supplier');
    expect(resolveDelegationTarget('PRICE_UPDATE')).toBe('pricing');
    expect(resolveDelegationTarget('LOW_MARGIN_REPORT')).toBe('pricing');
    expect(resolveDelegationTarget('PRICING_OPTIMIZE')).toBe('pricing');
    expect(resolveDelegationTarget('INVENTORY_STATUS')).toBe('inventory');
    expect(resolveDelegationTarget('CUSTOMER_SEGMENT')).toBe('customer');
    expect(resolveDelegationTarget('CUSTOMER_ORDER_TRENDS')).toBe('customer');
    expect(resolveDelegationTarget('ORDER_STATUS')).toBe('customer');
    expect(resolveDelegationTarget('FORECAST')).toBe('forecast');
    expect(resolveDelegationTarget('PENDING_APPROVALS')).toBe('approvals');
    expect(resolveDelegationTarget('OUTCOMES_REPORT')).toBe('outcomes');
    expect(resolveDelegationTarget('NEGOTIATION_LIST')).toBe('negotiation');
    expect(resolveDelegationTarget('CREATE_PRODUCT')).toBe('catalog');
    expect(resolveDelegationTarget('PRODUCT_LIST')).toBe('catalog');
    expect(resolveDelegationTarget('STORE_BUILD')).toBe('store_builder');
    expect(resolveDelegationTarget('STORE_PUBLISH')).toBe('store_builder');
    expect(resolveDelegationTarget('DESIGN_PROPOSE')).toBe('design');
    expect(resolveDelegationTarget('COPY_PROPOSE')).toBe('copy_seo');
    expect(resolveDelegationTarget('STORE_QA')).toBe('store_qa');
    expect(resolveDelegationTarget('UNKNOWN_INTENT')).toBeNull();
  });

  it('shouldSkipHandlerForSpecialist when active', () => {
    expect(shouldSkipHandlerForSpecialist('EMAIL_SUMMARY', true)).toBe(true);
    expect(shouldSkipHandlerForSpecialist('FORECAST', true)).toBe(true);
    expect(shouldSkipHandlerForSpecialist('EMAIL_SUMMARY', false)).toBe(false);
  });

  it('is disabled in production unless explicitly enabled', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.MULTI_AGENT_DELEGATION_ENABLED;
    expect(isMultiAgentDelegationEnabled()).toBe(false);
    process.env.NODE_ENV = 'test';
  });

  it('includes customer, catalog, and storefront agents in default allowed delegation targets', () => {
    delete process.env.MULTI_AGENT_ALLOWED_TARGETS;
    expect(getAllowedDelegationTargets().has('customer')).toBe(true);
    expect(getAllowedDelegationTargets().has('catalog')).toBe(true);
    expect(getAllowedDelegationTargets().has('store_builder')).toBe(true);
    expect(getAllowedDelegationTargets().has('design')).toBe(true);
    expect(getAllowedDelegationTargets().has('copy_seo')).toBe(true);
    expect(getAllowedDelegationTargets().has('store_qa')).toBe(true);
  });
});
