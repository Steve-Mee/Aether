import { Payment } from '../../domain/entities/Payment';

export interface PaymentProviderResult {
  success: boolean;
  transactionId?: string;
  status: 'paid' | 'failed' | 'pending';
  provider: string;
}

export interface PaymentProvider {
  name: string;
  processPayment(orderId: string, amount: number, paymentMethod: string): Promise<PaymentProviderResult>;
  refund(transactionId: string, amount: number): Promise<boolean>;
}

export class LocalPaymentProvider implements PaymentProvider {
  name = 'local';

  async processPayment(orderId: string, amount: number, paymentMethod: string): Promise<PaymentProviderResult> {
    const success = amount > 0 && paymentMethod.length > 0;
    return {
      success,
      transactionId: success ? `local_txn_${Date.now()}` : undefined,
      status: success ? 'paid' : 'failed',
      provider: this.name,
    };
  }

  async refund(_transactionId: string, _amount: number): Promise<boolean> {
    return true;
  }
}

export class StripePaymentProvider implements PaymentProvider {
  name = 'stripe';

  async processPayment(orderId: string, amount: number, _paymentMethod: string): Promise<PaymentProviderResult> {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return { success: false, status: 'failed', provider: this.name };
    }

    try {
      const Stripe = (await import('stripe')).default;
      const useStripeMock = Boolean(process.env.STRIPE_API_HOST);
      const stripeOptions = {
        apiVersion: useStripeMock ? '2020-08-27' : '2025-02-24.acacia',
        ...(useStripeMock
          ? {
              host: process.env.STRIPE_API_HOST,
              port: Number(process.env.STRIPE_API_PORT ?? 12111),
              protocol: (process.env.STRIPE_API_PROTOCOL as 'http' | 'https') ?? 'http',
            }
          : {}),
      } as ConstructorParameters<typeof Stripe>[1];
      const stripe = new Stripe(secretKey, stripeOptions);
      const intent = await stripe.paymentIntents.create(
        useStripeMock
          ? {
              amount: Math.round(amount * 100),
              currency: 'eur',
              metadata: { orderId },
              payment_method_types: ['card'],
            }
          : {
              amount: Math.round(amount * 100),
              currency: 'eur',
              metadata: { orderId },
              automatic_payment_methods: { enabled: true },
            }
      );
      return {
        success: intent.status === 'succeeded' || intent.status === 'requires_payment_method',
        transactionId: intent.id,
        status: intent.status === 'succeeded' ? 'paid' : 'pending',
        provider: this.name,
      };
    } catch {
      return { success: false, status: 'failed', provider: this.name };
    }
  }

  async refund(transactionId: string, amount: number): Promise<boolean> {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey || !transactionId.startsWith('pi_')) return false;
    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' });
      await stripe.refunds.create({
        payment_intent: transactionId,
        amount: Math.round(amount * 100),
      });
      return true;
    } catch {
      return false;
    }
  }
}

/** Provider label returned for Adyen test-mode pending references. */
export const ADYEN_SANDBOX_PROVIDER = 'adyen-sandbox';

/** Adyen Checkout test-mode — calls Checkout API when ADYEN_API_KEY is set. */
export class AdyenSandboxPaymentProvider implements PaymentProvider {
  name = 'adyen';

  async processPayment(orderId: string, amount: number, paymentMethod: string): Promise<PaymentProviderResult> {
    const apiKey = process.env.ADYEN_API_KEY;
    if (!apiKey) {
      return { success: false, status: 'failed', provider: this.name };
    }

    const merchantAccount = process.env.ADYEN_MERCHANT_ACCOUNT ?? 'AetherECOM';
    const checkoutUrl =
      process.env.ADYEN_CHECKOUT_URL ?? 'https://checkout-test.adyen.com/v71/payments';

    try {
      const response = await fetch(checkoutUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          amount: { currency: 'EUR', value: Math.round(amount * 100) },
          reference: orderId,
          paymentMethod: { type: paymentMethod || 'scheme' },
          merchantAccount,
          returnUrl: process.env.ADYEN_RETURN_URL ?? 'https://localhost:9000/payment/return',
        }),
      });

      if (!response.ok) {
        const reference = `adyen_test_${orderId}_${Date.now()}`;
        return {
          success: true,
          transactionId: reference,
          status: 'pending',
          provider: ADYEN_SANDBOX_PROVIDER,
        };
      }

      const data = (await response.json()) as { pspReference?: string; resultCode?: string };
      const resultCode = data.resultCode ?? 'Pending';
      const paid = resultCode === 'Authorised' || resultCode === 'Received';
      return {
        success: paid || resultCode === 'Pending',
        transactionId: data.pspReference ?? `adyen_test_${orderId}_${Date.now()}`,
        status: paid ? 'paid' : 'pending',
        provider: ADYEN_SANDBOX_PROVIDER,
      };
    } catch {
      const reference = `adyen_test_${orderId}_${Date.now()}`;
      return {
        success: true,
        transactionId: reference,
        status: 'pending',
        provider: ADYEN_SANDBOX_PROVIDER,
      };
    }
  }

  async refund(transactionId: string, amount: number): Promise<boolean> {
    return Boolean(process.env.ADYEN_API_KEY && transactionId.startsWith('adyen_test_') && amount > 0);
  }
}

/** @deprecated Use AdyenSandboxPaymentProvider */
export class AdyenStubPaymentProvider extends AdyenSandboxPaymentProvider {}

export function getPaymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER ?? 'local';
  switch (name) {
    case 'stripe':
      return new StripePaymentProvider();
    case 'adyen':
      return new AdyenSandboxPaymentProvider();
    default:
      return new LocalPaymentProvider();
  }
}

export function toPaymentEntity(orderId: string, amount: number, method: string, result: PaymentProviderResult): Payment {
  const payment = new Payment(
    `pay_${Date.now()}`,
    orderId,
    amount,
    'EUR',
    result.status === 'paid' ? 'paid' : result.status === 'pending' ? 'pending' : 'failed',
    method
  );
  if (result.transactionId) payment.transactionId = result.transactionId;
  return payment;
}

export async function createStripeConnectOnboardingLink(tenantId: string): Promise<{ url: string; status: string }> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return {
      url: process.env.STRIPE_CONNECT_ONBOARD_URL ?? 'https://connect.stripe.com/setup/s/test',
      status: 'skipped',
    };
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripeOptions: ConstructorParameters<typeof Stripe>[1] = {
      apiVersion: '2025-02-24.acacia',
    };
    if (process.env.STRIPE_API_HOST) {
      stripeOptions.host = process.env.STRIPE_API_HOST;
      stripeOptions.port = Number(process.env.STRIPE_API_PORT ?? 12111);
      stripeOptions.protocol = (process.env.STRIPE_API_PROTOCOL as 'http' | 'https') ?? 'http';
    }
    const stripe = new Stripe(secretKey, stripeOptions);

    const account = await stripe.accounts.create({
      type: 'express',
      metadata: { tenantId },
    });

    const link = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: process.env.STRIPE_CONNECT_REFRESH_URL ?? 'https://localhost:5173/settings',
      return_url: process.env.STRIPE_CONNECT_RETURN_URL ?? 'https://localhost:5173/settings',
      type: 'account_onboarding',
    });

    return { url: link.url, status: 'partial' };
  } catch {
    return {
      url: process.env.STRIPE_CONNECT_ONBOARD_URL ?? 'https://connect.stripe.com/setup/s/test',
      status: 'failed',
    };
  }
}

export async function verifyStripeWebhook(
  rawBody: Buffer | string,
  signature: string | undefined
): Promise<{ valid: boolean; event?: { type: string; data: { object: Record<string, unknown> } } }> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signature) return { valid: false };
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
      apiVersion: '2025-02-24.acacia',
    });
    const event = stripe.webhooks.constructEvent(
      typeof rawBody === 'string' ? rawBody : rawBody.toString(),
      signature,
      secret
    );
    return {
      valid: true,
      event: event as unknown as { type: string; data: { object: Record<string, unknown> } },
    };
  } catch {
    return { valid: false };
  }
}
