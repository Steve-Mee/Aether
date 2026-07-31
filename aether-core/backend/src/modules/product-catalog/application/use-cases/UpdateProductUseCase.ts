import {
  ProductRepository,
  UpdateProductInput,
} from '../../domain/repositories/ProductRepository';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class UpdateProductUseCase {
  constructor(private repo: ProductRepository) {}

  async execute(tenantId: string, productId: string, data: UpdateProductInput) {
    const tid = requireTenantId(tenantId, 'UpdateProductUseCase.execute');
    return this.repo.update(productId, tid, data);
  }
}
