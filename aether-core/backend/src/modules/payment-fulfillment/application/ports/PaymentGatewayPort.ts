export interface PaymentGatewayPort {
  processPayment(
    orderId: string,
    amount: number,
    paymentMethod: string
  ): Promise<{ transactionId?: string; status: string }>;
  refund(transactionId: string, amount: number): Promise<void | boolean>;
}

export interface PaymentEntityMapper {
  toPaymentEntity(
    orderId: string,
    amount: number,
    paymentMethod: string,
    result: { transactionId?: string; status: string }
  ): import('../../domain/entities/Payment').Payment;
}
