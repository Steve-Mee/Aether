import { ProductRepository } from '../../domain/repositories/ProductRepository';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class ListProductsUseCase {
  constructor(private repo: ProductRepository) {}

  async execute(tenantId: string) {
    const tid = requireTenantId(tenantId, 'ListProductsUseCase.execute');
    return this.repo.findAll(tid);
  }
}
