import { Product } from '../../domain/entities/Product';
import { ProductRepository } from '../../domain/repositories/ProductRepository';

export class CreateProductUseCase {
  constructor(private productRepository: ProductRepository) {}

  async execute(data: {
    name: string;
    description?: string;
    slug: string;
  }): Promise<Product> {
    const product = Product.create(data);
    return this.productRepository.create(product);
  }
}