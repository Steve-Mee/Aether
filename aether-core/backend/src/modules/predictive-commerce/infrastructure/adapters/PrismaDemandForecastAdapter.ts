import { prisma } from '../../../../shared/prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { DemandForecastPort } from '../../application/ports/DemandForecastPort';

export class PrismaDemandForecastAdapter implements DemandForecastPort {
  async getOrderHistory(productId: string, tenantId: string, since: Date) {
    const tid = requireTenantId(tenantId, 'DemandForecast.getOrderHistory');
    return prisma.orderItem.findMany({
      where: {
        productId,
        order: { tenantId: tid, createdAt: { gte: since } },
      },
      select: { quantity: true },
    });
  }
}

export const demandForecastAdapter = new PrismaDemandForecastAdapter();
