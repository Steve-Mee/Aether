import { BilateralSafetyFilter } from '../application/BilateralSafetyFilter';

describe('BilateralSafetyFilter', () => {
  const filter = new BilateralSafetyFilter();

  it('rejects forbidden fields', () => {
    const result = filter.filterPayload(
      { sku: 'ABC', product_count_band: '10-49' },
      ['product_count_band']
    );
    expect(result.rejected).toContain('sku:forbidden_field');
    expect(result.accepted).toEqual({ product_count_band: '10-49' });
  });

  it('rejects fields not in allowlist', () => {
    const result = filter.filterPayload(
      { turnover_index: 3, product_count_band: '10-49' },
      ['product_count_band']
    );
    expect(result.rejected).toContain('turnover_index:not_in_allowlist');
    expect(result.accepted).toEqual({ product_count_band: '10-49' });
  });

  it('rejects PII in values', () => {
    const result = filter.filterPayload(
      { product_count_band: 'user@test.com' },
      ['product_count_band']
    );
    expect(result.rejected).toContain('product_count_band:pii_detected');
  });
});
