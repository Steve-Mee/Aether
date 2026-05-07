import { Payment } from '../../domain/entities/Payment';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';

export class PaymentService {
  constructor(private paymentRepository: PaymentRepository) {}

  async processPayment(orderId: string, amount: number, paymentMethod: string): Promise<Payment> {
    const payment = new Payment(
      `pay_${Date.now()}`,
      orderId,
      amount,
      'EUR',
      'pending',
      paymentMethod
    );

    // Simulate payment processing
    // In real implementation: call Stripe/PayPal/etc.
    const success = Math.random() > 0.1; // 90% success rate for demo

    if (success) {
      payment.status = 'paid';
      payment.transactionId = `txn_${Date.now()}`;
    } else {
      payment.status = 'failed';
    }

    return this.paymentRepository.create(payment);
  }

  async refund(paymentId: string, amount?: number): Promise<void> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) throw new Error('Payment not found');

    // Simulate refund
    payment.status = 'refunded';
    await this.paymentRepository.updateStatus(paymentId, 'refunded');
  }
}