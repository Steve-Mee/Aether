import { ContributionSafetyFilter } from '../ContributionSafetyFilter';

describe('ContributionSafetyFilter', () => {
  const filter = new ContributionSafetyFilter();

  it('accepts allowed structured metrics', () => {
    const result = filter.filter([
      { category: 'pricing', metric: 'auto_apply_rate', value: 1, sampleSize: 1 },
      { category: 'conversion', metric: 'mail_auto_reply_rate', value: 1 },
    ]);
    expect(result.accepted).toHaveLength(2);
    expect(result.rejected).toHaveLength(0);
  });

  it('rejects invalid categories', () => {
    const result = filter.filter([
      { category: 'customers', metric: 'auto_apply_rate', value: 1 },
    ]);
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected[0]?.rejectReason).toBe('invalid_category');
  });

  it('rejects forbidden metric substrings', () => {
    const result = filter.filter([
      { category: 'pricing', metric: 'tenant_price_rate', value: 1 },
    ]);
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected[0]?.rejectReason).toBe('invalid_metric');
  });

  it('rejects out-of-bounds rate values', () => {
    const result = filter.filter([
      { category: 'pricing', metric: 'auto_apply_rate', value: 2 },
    ]);
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected[0]?.rejectReason).toBe('value_out_of_bounds');
  });

  it('rejects metric with forbidden substring', () => {
    const result = filter.filter([
      { category: 'pricing', metric: 'tenant_price_rate', value: 1 },
    ]);
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected[0]?.rejectReason).toBe('invalid_metric');
  });

  it('rejects when serialized payload matches PII email pattern in metric name edge case', () => {
    const result = filter.filter([
      { category: 'marketing', metric: 'promo_uplift_rate', value: 0.5, sampleSize: 1 },
    ]);
    expect(result.accepted).toHaveLength(1);
  });
});
