import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import type { InventoryRepository } from '../../domain/repositories/InventoryRepository';

export interface InventoryListItem {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  productName: string | null;
  productSlug: string | null;
  threshold: number;
  status: 'ok' | 'low';
}

export class ListInventoryUseCase {
  constructor(
    private inventoryRepo: InventoryRepository,
    private lowStockThreshold = 5
  ) {}

  async execute(tenantId: string): Promise<{ items: InventoryListItem[] }> {
    const tid = requireTenantId(tenantId, 'ListInventoryUseCase.execute');
    const rows = await this.inventoryRepo.listInventoryItems(tid);

    const productIds = [...new Set(rows.map((r) => r.productId))];
    const products = await this.inventoryRepo.listProductsByIds(tid, productIds);
    const byId = new Map(products.map((p) => [p.id, p]));

    const items: InventoryListItem[] = rows.map((r) => {
      const product = byId.get(r.productId);
      return {
        id: r.id,
        productId: r.productId,
        warehouseId: r.warehouseId,
        quantity: r.quantity,
        productName: product?.name ?? null,
        productSlug: product?.slug ?? null,
        threshold: this.lowStockThreshold,
        status: r.quantity <= this.lowStockThreshold ? 'low' : 'ok',
      };
    });

    return { items };
  }
}
