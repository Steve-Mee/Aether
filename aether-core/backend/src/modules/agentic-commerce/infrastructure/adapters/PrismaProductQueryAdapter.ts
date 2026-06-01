import { prisma } from '../../../../shared/prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { ProductQueryPort } from '../../application/ports/ProductQueryPort';

export class PrismaProductQueryAdapter implements ProductQueryPort {
  async findPrice(tenantId: string, productId: string): Promise<number | null> {
    const tid = requireTenantId(tenantId, 'ProductQuery.findPrice');
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId: tid },
    });
    return product?.price ?? null;
  }
}

export const productQueryAdapter = new PrismaProductQueryAdapter();
