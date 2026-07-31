import {
  ProductRepository,
  UpdateVariantInput,
} from '../../domain/repositories/ProductRepository';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class UpdateProductVariantUseCase {
  constructor(private repo: ProductRepository) {}

  async execute(
    tenantId: string,
    productId: string,
    variantId: string,
    data: UpdateVariantInput
  ) {
    const tid = requireTenantId(tenantId, 'UpdateProductVariantUseCase.execute');
    return this.repo.updateVariant(productId, variantId, tid, data);
  }
}
