import { verifyStripeWebhook } from '../modules/payment-fulfillment/infrastructure/providers/PaymentProvider';

describe('Stripe webhook verification', () => {
  it('rejects when secret or signature missing', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const result = await verifyStripeWebhook('{}', undefined);
    expect(result.valid).toBe(false);
  });

  it('rejects invalid signature', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
    const result = await verifyStripeWebhook('{"id":"evt_1"}', 'invalid_sig');
    expect(result.valid).toBe(false);
  });
});
