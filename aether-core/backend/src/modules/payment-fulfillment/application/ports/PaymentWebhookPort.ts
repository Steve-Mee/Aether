export interface PaymentWebhookPort {
  markPaidByTransaction(tenantId: string, transactionId: string): Promise<void>;
}
