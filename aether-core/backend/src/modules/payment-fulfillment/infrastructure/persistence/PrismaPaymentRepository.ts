import { PrismaClient } from '@prisma/client';
import { Payment } from '../../domain/entities/Payment';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class PrismaPaymentRepository implements PaymentRepository {
  constructor(private prisma: PrismaClient) {}

  async create(payment: Payment, tenantId: string): Promise<Payment> {
    const tid = requireTenantId(tenantId, 'PrismaPaymentRepository.create');
    await this.prisma.payment.create({
      data: {
        id: payment.id,
        tenantId: tid,
        orderId: payment.orderId,
        amount: payment.amount,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
      },
    });
    return payment;
  }

  async findById(id: string, tenantId: string): Promise<Payment | null> {
    const tid = requireTenantId(tenantId, 'PrismaPaymentRepository.findById');
    const row = await this.prisma.payment.findFirst({ where: { id, tenantId: tid } });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByOrderId(orderId: string, tenantId: string): Promise<Payment[]> {
    const tid = requireTenantId(tenantId, 'PrismaPaymentRepository.findByOrderId');
    const rows = await this.prisma.payment.findMany({ where: { orderId, tenantId: tid } });
    return rows.map((r) => this.toDomain(r));
  }

  async listByTenant(tenantId: string): Promise<Payment[]> {
    const tid = requireTenantId(tenantId, 'PrismaPaymentRepository.listByTenant');
    const rows = await this.prisma.payment.findMany({
      where: { tenantId: tid },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async updateStatus(id: string, status: Payment['status'], tenantId: string): Promise<void> {
    const tid = requireTenantId(tenantId, 'PrismaPaymentRepository.updateStatus');
    await this.prisma.payment.updateMany({
      where: { id, tenantId: tid },
      data: { status },
    });
  }

  private toDomain(row: {
    id: string;
    orderId: string;
    amount: number;
    status: string;
    paymentMethod: string | null;
    transactionId: string | null;
  }): Payment {
    return new Payment(
      row.id,
      row.orderId,
      row.amount,
      'EUR',
      row.status as Payment['status'],
      row.paymentMethod ?? '',
      row.transactionId ?? undefined
    );
  }
}
