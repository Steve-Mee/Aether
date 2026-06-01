import {
  PaymentGatewayPort,
  PaymentEntityMapper,
} from '../../application/ports/PaymentGatewayPort';
import { getPaymentProvider, toPaymentEntity } from '../providers/PaymentProvider';

export class StripePaymentGatewayAdapter implements PaymentGatewayPort, PaymentEntityMapper {
  private provider = getPaymentProvider();

  processPayment(orderId: string, amount: number, paymentMethod: string) {
    return this.provider.processPayment(orderId, amount, paymentMethod);
  }

  refund(transactionId: string, amount: number) {
    return this.provider.refund(transactionId, amount);
  }

  toPaymentEntity(
    orderId: string,
    amount: number,
    paymentMethod: string,
    result: { transactionId?: string; status: string }
  ) {
    return toPaymentEntity(orderId, amount, paymentMethod, {
      success: result.status === 'paid',
      status: result.status as 'paid' | 'pending' | 'failed',
      transactionId: result.transactionId,
      provider: process.env.PAYMENT_PROVIDER ?? 'local',
    });
  }
}

export const paymentGateway = new StripePaymentGatewayAdapter();
