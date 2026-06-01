import { Payment } from '../entities/Payment';

export interface PaymentRepository {
  create(payment: Payment, tenantId: string): Promise<Payment>;
  findById(id: string, tenantId: string): Promise<Payment | null>;
  findByOrderId(orderId: string, tenantId: string): Promise<Payment[]>;
  updateStatus(id: string, status: Payment['status'], tenantId: string): Promise<void>;
}
