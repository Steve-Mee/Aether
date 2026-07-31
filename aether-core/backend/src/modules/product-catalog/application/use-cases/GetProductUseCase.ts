import { ProductRepository } from '../../domain/repositories/ProductRepository';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class GetProductUseCase {
  constructor(private repo: ProductRepository) {}

  async execute(tenantId: string, productId: string) {
    const tid = requireTenantId(tenantId, 'GetProductUseCase.execute');
    return this.repo.findById(productId, tid);
  }
}
