import { PaymentService } from '../services/PaymentService';

export class ProcessPaymentUseCase {
  constructor(private paymentService: PaymentService) {}

  async execute(
    orderId: string,
    amount: number,
    paymentMethod: string,
    ctx?: { tenantId: string; idempotencyKey?: string; actorId?: string }
  ) {
    return this.paymentService.processPayment(orderId, amount, paymentMethod, ctx);
  }
}
