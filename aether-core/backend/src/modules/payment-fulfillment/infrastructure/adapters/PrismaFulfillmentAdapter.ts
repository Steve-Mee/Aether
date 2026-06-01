import { prisma } from '../../../../shared/prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class PrismaFulfillmentAdapter {
  async persistFulfillment(tenantId: string, orderId: string, status: string) {
    const tid = requireTenantId(tenantId, 'Fulfillment.persist');
    return prisma.fulfillment.create({ data: { tenantId: tid, orderId, status } });
  }
}
