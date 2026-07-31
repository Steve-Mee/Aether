import { sanitizePiiForLogs } from '../sanitizePiiForLogs';

describe('sanitizePiiForLogs', () => {
  it('redacts sensitive keys and email/token patterns', () => {
    const out = sanitizePiiForLogs({
      tenantId: 'tenant_a',
      email: 'buyer@example.com',
      note: 'Contact buyer@example.com via Preview abc.def',
      nested: { clientSecret: 'sk_live_x', orderId: 'ord_1' },
    });

    expect(out.tenantId).toBe('tenant_a');
    expect(out.email).toBe('[redacted]');
    expect(out.note).toBe('Contact [email-redacted] via Preview [redacted]');
    expect(out.nested).toEqual({ clientSecret: '[redacted]', orderId: 'ord_1' });
  });
});
