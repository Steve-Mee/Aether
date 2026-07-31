import { PaymentProvider, PaymentProviderResult } from './paymentProviderTypes';

export class StripePaymentProvider implements PaymentProvider {
  name = 'stripe';

  async processPayment(orderId: string, amount: number, _paymentMethod: string): Promise<PaymentProviderResult> {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return { success: false, status: 'failed', provider: this.name };
    }

    const amountCents = Math.round(amount * 100);
    const mockHost = process.env.STRIPE_API_HOST;

    if (mockHost) {
      const host = mockHost === 'localhost' ? '127.0.0.1' : mockHost;
      const port = process.env.STRIPE_API_PORT ?? '12111';
      const protocol = process.env.STRIPE_API_PROTOCOL ?? 'http';
      try {
        const res = await fetch(`${protocol}://${host}:${port}/v1/payment_intents`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            amount: String(amountCents),
            currency: 'eur',
          }),
        });
        const intent = (await res.json()) as {
          id?: string;
          status?: string;
          client_secret?: string;
        };
        if (!res.ok || !intent.id?.startsWith('pi_')) {
          return { success: false, status: 'failed', provider: this.name };
        }
        return {
          success: true,
          transactionId: intent.id,
          status: intent.status === 'succeeded' ? 'paid' : 'pending',
          provider: this.name,
          clientSecret: intent.client_secret ?? `local_cs_${intent.id}`,
        };
      } catch {
        return { success: false, status: 'failed', provider: this.name };
      }
    }

    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' });
      const intent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'eur',
        metadata: { orderId },
        automatic_payment_methods: { enabled: true },
      });
      const okStatuses = new Set([
        'succeeded',
        'requires_payment_method',
        'requires_confirmation',
        'requires_action',
        'processing',
      ]);
      return {
        success: okStatuses.has(intent.status),
        transactionId: intent.id,
        status: intent.status === 'succeeded' ? 'paid' : 'pending',
        provider: this.name,
        clientSecret: intent.client_secret ?? undefined,
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
