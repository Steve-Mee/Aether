import { InventoryRepository } from '../../domain/repositories/InventoryRepository';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class UpdateInventoryUseCase {
  constructor(private repo: InventoryRepository) {}

  async execute(
    tenantId: string,
    productId: string,
    warehouseId: string,
    newQuantity: number
  ): Promise<void> {
    const tid = requireTenantId(tenantId, 'UpdateInventoryUseCase.execute');
    await this.repo.updateInventory(tid, productId, warehouseId, newQuantity);
  }
}
