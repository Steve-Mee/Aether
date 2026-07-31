import { PaymentProvider, PaymentProviderResult } from './paymentProviderTypes';

export class LocalPaymentProvider implements PaymentProvider {
  name = 'local';

  async processPayment(orderId: string, amount: number, paymentMethod: string): Promise<PaymentProviderResult> {
    const success = amount > 0 && paymentMethod.length > 0;
    const transactionId = success ? `local_txn_${Date.now()}` : undefined;
    return {
      success,
      transactionId,
      status: success ? 'paid' : 'failed',
      provider: this.name,
      clientSecret: transactionId ? `local_cs_${transactionId}` : undefined,
    };
  }

  async refund(_transactionId: string, _amount: number): Promise<boolean> {
    return true;
  }
}
