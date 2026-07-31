import { PaymentProvider, PaymentProviderResult } from './paymentProviderTypes';

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

      const returnUrl = process.env.ADYEN_RETURN_URL ?? 'https://localhost:9000/payment/return';
      if (!response.ok) {
        const reference = `adyen_test_${orderId}_${Date.now()}`;
        return {
          success: true,
          transactionId: reference,
          status: 'pending',
          provider: ADYEN_SANDBOX_PROVIDER,
          redirectUrl: returnUrl,
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
        redirectUrl: returnUrl,
      };
    } catch {
      const reference = `adyen_test_${orderId}_${Date.now()}`;
      return {
        success: true,
        transactionId: reference,
        status: 'pending',
        provider: ADYEN_SANDBOX_PROVIDER,
        redirectUrl: process.env.ADYEN_RETURN_URL ?? 'https://localhost:9000/payment/return',
      };
    }
  }

  async refund(transactionId: string, amount: number): Promise<boolean> {
    return Boolean(process.env.ADYEN_API_KEY && transactionId.startsWith('adyen_test_') && amount > 0);
  }
}

/** @deprecated Use AdyenSandboxPaymentProvider */
export class AdyenStubPaymentProvider extends AdyenSandboxPaymentProvider {}
