import { UpdateInventoryUseCase } from './UpdateInventoryUseCase';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class AdjustInventoryUseCase {
  constructor(private updateInventory: UpdateInventoryUseCase) {}

  async execute(
    tenantId: string,
    data: { productId: string; warehouseId?: string; quantity: number }
  ) {
    const tid = requireTenantId(tenantId, 'AdjustInventoryUseCase.execute');
    const warehouseId = data.warehouseId ?? 'default';
    await this.updateInventory.execute(tid, data.productId, warehouseId, data.quantity);
    return {
      productId: data.productId,
      warehouseId,
      quantity: data.quantity,
    };
  }
}
