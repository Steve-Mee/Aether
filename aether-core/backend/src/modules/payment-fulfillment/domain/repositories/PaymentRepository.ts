import { Payment } from '../entities/Payment';

export interface PaymentRepository {
  create(payment: Payment): Promise<Payment>;
  findById(id: string): Promise<Payment | null>;
  findByOrderId(orderId: string): Promise<Payment[]>;
  updateStatus(id: string, status: Payment['status']): Promise<void>;
}