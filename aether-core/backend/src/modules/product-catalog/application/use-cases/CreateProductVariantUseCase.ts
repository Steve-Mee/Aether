import {
  CreateVariantInput,
  ProductRepository,
} from '../../domain/repositories/ProductRepository';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class CreateProductVariantUseCase {
  constructor(private repo: ProductRepository) {}

  async execute(tenantId: string, productId: string, data: CreateVariantInput) {
    const tid = requireTenantId(tenantId, 'CreateProductVariantUseCase.execute');
    return this.repo.createVariant(productId, tid, data);
  }
}
