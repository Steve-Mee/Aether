import { logger } from '../logging/logger';

export interface InvoiceDraftResult {
  invoiceId: string;
  status: 'draft' | 'skipped' | 'failed';
}

/** Creates a Stripe invoice draft when Connect is configured; otherwise records intent only. */
export async function createSuccessFeeInvoiceDraft(params: {
  tenantId: string;
  billingId: string;
  amount: number;
  currency?: string;
}): Promise<InvoiceDraftResult> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const connectAccount = process.env.STRIPE_CONNECT_ACCOUNT_ID;

  if (!secretKey || !connectAccount || params.amount <= 0) {
    logger.info('billing_invoice_skipped', {
      tenantId: params.tenantId,
      billingId: params.billingId,
      reason: 'Stripe Connect not configured',
    });
    return { invoiceId: `local_${params.billingId}`, status: 'skipped' };
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

    const invoice = await stripe.invoices.create(
      {
        customer: connectAccount,
        collection_method: 'send_invoice',
        days_until_due: 30,
        metadata: {
          tenantId: params.tenantId,
          billingId: params.billingId,
          type: 'aether_success_fee',
        },
      },
      { stripeAccount: connectAccount }
    );

    await stripe.invoiceItems.create(
      {
        customer: connectAccount,
        invoice: invoice.id,
        amount: Math.round(params.amount * 100),
        currency: (params.currency ?? 'eur').toLowerCase(),
        description: 'AETHER success fee (verified uplift)',
      },
      { stripeAccount: connectAccount }
    );

    return { invoiceId: invoice.id, status: 'draft' };
  } catch (error) {
    logger.error('billing_invoice_failed', {
      tenantId: params.tenantId,
      billingId: params.billingId,
      message: error instanceof Error ? error.message : String(error),
    });
    return { invoiceId: '', status: 'failed' };
  }
}
