import {
  classifyBrainAction,
  isLowRiskExecutable,
  LOW_RISK_EXECUTE_WHITELIST,
} from '../ActionRiskClassifier';

describe('ActionRiskClassifier', () => {
  it('classifies read tools as low risk without inbox', () => {
    const assessment = classifyBrainAction('search_products', { query: 'widget' });
    expect(assessment.risk).toBe('low');
    expect(assessment.requiresInbox).toBe(false);
  });

  it('classifies getPendingApprovals as low risk', () => {
    const assessment = classifyBrainAction('getPendingApprovals', {});
    expect(assessment.risk).toBe('low');
    expect(assessment.requiresInbox).toBe(false);
  });

  it('escalates updatePrice risk by percentage magnitude', () => {
    const medium = classifyBrainAction('updatePrice', { percentage: 5 }, { productCount: 2 });
    expect(medium.risk).toBe('medium');
    expect(medium.requiresInbox).toBe(false);

    const high = classifyBrainAction('updatePrice', { percentage: 15 }, { productCount: 2 });
    expect(high.risk).toBe('high');
    expect(high.requiresInbox).toBe(true);
    expect(high.expectedImpact).toContain('15%');
  });

  it('requires inbox for syncSupplier', () => {
    const assessment = classifyBrainAction('syncSupplier', { supplierId: 'sup-1' });
    expect(assessment.risk).toBe('medium');
    expect(assessment.requiresInbox).toBe(true);
  });

  it('classifies createInsight as low risk without inbox', () => {
    const assessment = classifyBrainAction('createInsight', {
      metric: 'sales',
      summary: 'Widget sells well',
    });
    expect(assessment.risk).toBe('low');
    expect(assessment.requiresInbox).toBe(false);
  });

  it('classifies createApproval as high risk', () => {
    const assessment = classifyBrainAction('createApproval', {
      module: 'admin-command-bar',
      actionType: 'price.change',
    });
    expect(assessment.risk).toBe('high');
    expect(assessment.requiresInbox).toBe(true);
  });

  it('whitelists createInsight for executeLowRiskAction', () => {
    expect(LOW_RISK_EXECUTE_WHITELIST.has('createInsight')).toBe(true);
    expect(isLowRiskExecutable('updatePrice')).toBe(false);

    const allowed = classifyBrainAction('executeLowRiskAction', {
      action: 'createInsight',
      input: {},
    });
    expect(allowed.risk).toBe('low');

    const blocked = classifyBrainAction('executeLowRiskAction', {
      action: 'updatePrice',
      input: {},
    });
    expect(blocked.risk).toBe('high');
  });
});
