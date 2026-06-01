import { prisma } from '../../../../shared/prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { PaymentIdempotencyPort } from '../../application/ports/PaymentIdempotencyPort';

export class PrismaPaymentIdempotencyAdapter implements PaymentIdempotencyPort {
  async findPaymentId(tenantId: string, key: string): Promise<string | null> {
    const tid = requireTenantId(tenantId, 'PaymentIdempotency.find');
    const existing = await prisma.paymentIdempotency.findUnique({
      where: { tenantId_key: { tenantId: tid, key } },
    });
    return existing?.paymentId ?? null;
  }

  async save(tenantId: string, key: string, paymentId: string): Promise<void> {
    const tid = requireTenantId(tenantId, 'PaymentIdempotency.save');
    await prisma.paymentIdempotency.upsert({
      where: { tenantId_key: { tenantId: tid, key } },
      create: { tenantId: tid, key, paymentId },
      update: { paymentId },
    });
  }
}

export const paymentIdempotencyAdapter = new PrismaPaymentIdempotencyAdapter();
