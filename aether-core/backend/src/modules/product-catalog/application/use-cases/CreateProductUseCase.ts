import { Product } from '../../domain/entities/Product';
import { ProductRepository } from '../../domain/repositories/ProductRepository';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class CreateProductUseCase {
  constructor(private productRepository: ProductRepository) {}

  async execute(
    tenantId: string,
    data: {
      name: string;
      description?: string;
      slug: string;
      price?: number;
      stock?: number;
    }
  ): Promise<Product> {
    const tid = requireTenantId(tenantId, 'CreateProductUseCase.execute');
    const product = Product.create(data);
    return this.productRepository.create(product, tid, {
      price: data.price ?? 0,
      stock: data.stock ?? 0,
    });
  }
}
