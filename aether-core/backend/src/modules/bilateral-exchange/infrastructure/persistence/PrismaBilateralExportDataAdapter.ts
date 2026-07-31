import { prisma } from '../../../../shared/prisma/client';
import type { BilateralExportDataPort } from '../../application/ports/BilateralExportDataPort';

export class PrismaBilateralExportDataAdapter implements BilateralExportDataPort {
  countProducts(tenantId: string) {
    return prisma.product.count({ where: { tenantId } });
  }

  countLowStockProducts(tenantId: string, threshold: number) {
    return prisma.product.count({ where: { tenantId, stock: { lte: threshold } } });
  }

  findSupplierTypes(tenantId: string, limit: number) {
    return prisma.supplier.findMany({
      where: { tenantId },
      select: { supplierType: true },
      take: limit,
    });
  }
}
