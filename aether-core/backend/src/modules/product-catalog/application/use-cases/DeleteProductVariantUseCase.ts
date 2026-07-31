import { ProductRepository } from '../../domain/repositories/ProductRepository';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class DeleteProductVariantUseCase {
  constructor(private repo: ProductRepository) {}

  async execute(tenantId: string, productId: string, variantId: string): Promise<boolean> {
    const tid = requireTenantId(tenantId, 'DeleteProductVariantUseCase.execute');
    return this.repo.deleteVariant(productId, variantId, tid);
  }
}
