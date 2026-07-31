export interface PaymentGatewayResult {
  transactionId?: string;
  status: string;
  /** Stripe PaymentIntent client secret (sandbox / Elements). */
  clientSecret?: string;
  /** Hosted redirect URL when applicable (e.g. Adyen return). */
  redirectUrl?: string;
}

export interface PaymentGatewayPort {
  processPayment(
    orderId: string,
    amount: number,
    paymentMethod: string
  ): Promise<PaymentGatewayResult>;
  refund(transactionId: string, amount: number): Promise<void | boolean>;
}

export interface PaymentEntityMapper {
  toPaymentEntity(
    orderId: string,
    amount: number,
    paymentMethod: string,
    result: PaymentGatewayResult
  ): import('../../domain/entities/Payment').Payment;
}
