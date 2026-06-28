import { prisma } from '../../../shared/prisma/client';

export class BilateralExportBuilder {
  async buildForSchema(
    tenantId: string,
    schemaKey: string,
    allowedFields: string[]
  ): Promise<Record<string, unknown>> {
    const allowed = new Set(allowedFields.map((f) => f.toLowerCase()));
    const payload: Record<string, unknown> = {};

    if (schemaKey === 'inventory_turnover_band') {
      const [productCount, lowStockCount] = await Promise.all([
        prisma.product.count({ where: { tenantId } }),
        prisma.product.count({ where: { tenantId, stock: { lte: 5 } } }),
      ]);
      if (allowed.has('product_count_band')) {
        payload.product_count_band = this.toCountBand(productCount);
      }
      if (allowed.has('low_stock_ratio') && productCount > 0) {
        payload.low_stock_ratio = Math.round((lowStockCount / productCount) * 100) / 100;
      }
      if (allowed.has('turnover_index')) {
        payload.turnover_index = Math.min(10, Math.round(productCount / 10));
      }
    }

    if (schemaKey === 'promo_uplift_aggregate') {
      if (allowed.has('promo_uplift_rate')) {
        payload.promo_uplift_rate = 0.05;
      }
      if (allowed.has('sample_size')) {
        payload.sample_size = Math.max(1, await prisma.product.count({ where: { tenantId } }));
      }
    }

    if (schemaKey === 'supplier_category_mix') {
      const suppliers = await prisma.supplier.findMany({
        where: { tenantId },
        select: { supplierType: true },
        take: 100,
      });
      const categories = new Set(
        suppliers.map((s) => s.supplierType).filter((c): c is string => Boolean(c))
      );
      if (allowed.has('category_count')) {
        payload.category_count = categories.size;
      }
      if (allowed.has('top_category_share') && suppliers.length > 0) {
        const counts = new Map<string, number>();
        for (const s of suppliers) {
          const cat = s.supplierType ?? 'unknown';
          counts.set(cat, (counts.get(cat) ?? 0) + 1);
        }
        const max = Math.max(...counts.values());
        payload.top_category_share = Math.round((max / suppliers.length) * 100) / 100;
      }
    }

    return payload;
  }

  private toCountBand(count: number): string {
    if (count < 10) return '1-9';
    if (count < 50) return '10-49';
    if (count < 200) return '50-199';
    return '200+';
  }
}
