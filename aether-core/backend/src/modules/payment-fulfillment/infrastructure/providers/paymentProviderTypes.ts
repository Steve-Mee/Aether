export interface PaymentProviderResult {
  success: boolean;
  transactionId?: string;
  status: 'paid' | 'failed' | 'pending';
  provider: string;
  clientSecret?: string;
  redirectUrl?: string;
}

export interface PaymentProvider {
  name: string;
  processPayment(orderId: string, amount: number, paymentMethod: string): Promise<PaymentProviderResult>;
  refund(transactionId: string, amount: number): Promise<boolean>;
}
