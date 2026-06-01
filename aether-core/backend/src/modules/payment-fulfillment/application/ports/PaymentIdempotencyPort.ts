export interface PaymentIdempotencyPort {
  findPaymentId(tenantId: string, key: string): Promise<string | null>;
  save(tenantId: string, key: string, paymentId: string): Promise<void>;
}
