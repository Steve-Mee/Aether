import { Product } from '../entities/Product';

export interface ProductRepository {
  findAll(tenantId: string): Promise<Product[]>;
  findById(id: string, tenantId: string): Promise<Product | null>;
  findBySlug(slug: string, tenantId: string): Promise<Product | null>;
  create(product: Product, tenantId: string, extras?: { price?: number; stock?: number }): Promise<Product>;
  update(product: Product, tenantId: string): Promise<Product>;
  delete(id: string, tenantId: string): Promise<void>;
}
