import { prisma } from '../../../../shared/prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { PaymentWebhookPort } from '../../application/ports/PaymentWebhookPort';

export class PrismaPaymentWebhookAdapter implements PaymentWebhookPort {
  async markPaidByTransaction(tenantId: string, transactionId: string): Promise<void> {
    const tid = requireTenantId(tenantId, 'PaymentWebhook.markPaid');
    await prisma.payment.updateMany({
      where: { tenantId: tid, transactionId },
      data: { status: 'paid' },
    });
  }
}

export const paymentWebhookAdapter = new PrismaPaymentWebhookAdapter();
