import { ProductRepository } from '../../domain/repositories/ProductRepository';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class DeleteProductUseCase {
  constructor(private repo: ProductRepository) {}

  async execute(tenantId: string, productId: string): Promise<boolean> {
    const tid = requireTenantId(tenantId, 'DeleteProductUseCase.execute');
    return this.repo.delete(productId, tid);
  }
}
