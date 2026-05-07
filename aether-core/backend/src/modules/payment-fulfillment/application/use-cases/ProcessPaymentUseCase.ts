import { PaymentService } from '../services/PaymentService';

export class ProcessPaymentUseCase {
  constructor(private paymentService: PaymentService) {}

  async execute(orderId: string, amount: number, paymentMethod: string) {
    return this.paymentService.processPayment(orderId, amount, paymentMethod);
  }
}