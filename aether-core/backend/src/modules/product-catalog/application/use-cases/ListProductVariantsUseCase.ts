import { ProductRepository } from '../../domain/repositories/ProductRepository';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class ListProductVariantsUseCase {
  constructor(private repo: ProductRepository) {}

  async execute(tenantId: string, productId: string) {
    const tid = requireTenantId(tenantId, 'ListProductVariantsUseCase.execute');
    const product = await this.repo.findById(productId, tid);
    if (!product) return null;
    return this.repo.listVariants(productId, tid);
  }
}
