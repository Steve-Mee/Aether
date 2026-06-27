import { SummaryDistiller } from '../SummaryDistiller';

describe('SummaryDistiller', () => {
  const distiller = new SummaryDistiller();

  it('strips prices, SKUs, and emails', () => {
    const raw =
      'Supplier Acme SKU-ABC123 raised price to €12.99 contact sales@acme.com tenant_abc123';
    const out = distiller.distill(raw);
    expect(out).not.toMatch(/€12\.99/);
    expect(out).not.toMatch(/SKU-ABC123/i);
    expect(out).not.toMatch(/sales@acme\.com/);
    expect(out).not.toMatch(/tenant_abc123/i);
  });

  it('caps output length', () => {
    const long = 'x'.repeat(1000);
    expect(distiller.distill(long).length).toBeLessThanOrEqual(500);
  });
});
