import {
  LocalPaymentProvider,
  StripePaymentProvider,
  AdyenSandboxPaymentProvider,
  getPaymentProvider,
} from '../modules/payment-fulfillment/infrastructure/providers/PaymentProvider';

describe('PaymentProvider', () => {
  it('local provider succeeds for valid payments', async () => {
    const provider = new LocalPaymentProvider();
    const result = await provider.processPayment('ord_1', 50, 'card');
    expect(result.success).toBe(true);
    expect(result.provider).toBe('local');
    expect(result.transactionId).toBeDefined();
  });

  it('stripe provider fails without secret key', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const provider = new StripePaymentProvider();
    const result = await provider.processPayment('ord_1', 50, 'card');
    expect(result.success).toBe(false);
  });

  it('getPaymentProvider respects PAYMENT_PROVIDER env', () => {
    process.env.PAYMENT_PROVIDER = 'local';
    expect(getPaymentProvider().name).toBe('local');
  });

  it('adyen sandbox returns pending reference when ADYEN_API_KEY is set', async () => {
    process.env.ADYEN_API_KEY = 'fake-key';
    const provider = new AdyenSandboxPaymentProvider();
    const result = await provider.processPayment('ord_1', 50, 'card');
    expect(result.success).toBe(true);
    expect(result.status).toBe('pending');
    expect(result.transactionId).toMatch(/^adyen_test_/);
    expect(result.provider).toBe('adyen-sandbox');
  });

  it('getPaymentProvider returns adyen stub when configured', () => {
    process.env.PAYMENT_PROVIDER = 'adyen';
    expect(getPaymentProvider().name).toBe('adyen');
  });
});
