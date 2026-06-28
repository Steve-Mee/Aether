import { StripePaymentProvider } from '../modules/payment-fulfillment/infrastructure/providers/PaymentProvider';

const describeIfStripeMock =
  process.env.CI === 'true' && process.env.STRIPE_API_HOST ? describe : describe.skip;

describeIfStripeMock('Stripe integration (stripe-mock)', () => {
  beforeAll(() => {
    process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? 'sk_test_123';
    process.env.STRIPE_API_HOST = process.env.STRIPE_API_HOST ?? 'localhost';
    process.env.STRIPE_API_PORT = process.env.STRIPE_API_PORT ?? '12111';
    process.env.STRIPE_API_PROTOCOL = process.env.STRIPE_API_PROTOCOL ?? 'http';
  });

  it('creates a real PaymentIntent via stripe-mock', async () => {
    const provider = new StripePaymentProvider();
    const result = await provider.processPayment('ord_ci_1', 49.99, 'card');
    expect(result.provider).toBe('stripe');
    expect(result.success).toBe(true);
    expect(result.transactionId).toMatch(/^pi_/);
    expect(['paid', 'pending']).toContain(result.status);
  });
});
