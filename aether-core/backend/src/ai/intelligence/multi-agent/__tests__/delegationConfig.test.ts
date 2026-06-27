import { resolveDelegationTarget, isMultiAgentDelegationEnabled, shouldSkipHandlerForSpecialist } from '../delegationConfig';

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
    expect(resolveDelegationTarget('FORECAST')).toBeNull();
  });

  it('shouldSkipHandlerForSpecialist when active', () => {
    expect(shouldSkipHandlerForSpecialist('EMAIL_SUMMARY', true)).toBe(true);
    expect(shouldSkipHandlerForSpecialist('FORECAST', true)).toBe(false);
    expect(shouldSkipHandlerForSpecialist('EMAIL_SUMMARY', false)).toBe(false);
  });

  it('is disabled in production unless explicitly enabled', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.MULTI_AGENT_DELEGATION_ENABLED;
    expect(isMultiAgentDelegationEnabled()).toBe(false);
    process.env.NODE_ENV = 'test';
  });
});
