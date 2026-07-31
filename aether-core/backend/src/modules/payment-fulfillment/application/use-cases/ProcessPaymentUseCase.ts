import { PaymentService } from '../services/PaymentService';

export class ProcessPaymentUseCase {
  constructor(private paymentService: PaymentService) {}

  async execute(
    orderId: string,
    amount: number,
    paymentMethod: string,
    ctx?: { tenantId: string; idempotencyKey?: string; actorId?: string }
  ) {
    const result = await this.paymentService.processPayment(
      orderId,
      amount,
      paymentMethod,
      ctx
    );
    // Admin payment HTTP keeps Payment entity; checkout reads secrets via PaymentService.
    return result.payment;
  }
}
