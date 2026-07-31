import { Payment } from '../../domain/entities/Payment';
import { AdyenSandboxPaymentProvider } from './AdyenSandboxPaymentProvider';
import { LocalPaymentProvider } from './LocalPaymentProvider';
import { PaymentProvider, PaymentProviderResult } from './paymentProviderTypes';
import { StripePaymentProvider } from './StripePaymentProvider';

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
