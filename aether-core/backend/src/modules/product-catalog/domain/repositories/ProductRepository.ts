import { Product } from '../entities/Product';
import { ProductDetail } from '../entities/ProductDetail';
import { ProductVariant } from '../entities/ProductVariant';

export interface UpdateProductInput {
  name?: string;
  description?: string | null;
  slug?: string;
  status?: string;
  price?: number;
  stock?: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  categoryId?: string | null;
}

export interface CreateVariantInput {
  sku: string;
  price: number;
  currency?: string;
  stock?: number;
}

export interface UpdateVariantInput {
  sku?: string;
  price?: number;
  currency?: string;
  stock?: number;
}

export interface ProductRepository {
  findAll(tenantId: string): Promise<ProductDetail[]>;
  findById(id: string, tenantId: string): Promise<ProductDetail | null>;
  findBySlug(slug: string, tenantId: string): Promise<Product | null>;
  create(
    product: Product,
    tenantId: string,
    extras?: { price?: number; stock?: number }
  ): Promise<ProductDetail>;
  update(id: string, tenantId: string, data: UpdateProductInput): Promise<ProductDetail | null>;
  delete(id: string, tenantId: string): Promise<boolean>;
  listVariants(productId: string, tenantId: string): Promise<ProductVariant[]>;
  createVariant(
    productId: string,
    tenantId: string,
    data: CreateVariantInput
  ): Promise<ProductVariant | null>;
  updateVariant(
    productId: string,
    variantId: string,
    tenantId: string,
    data: UpdateVariantInput
  ): Promise<ProductVariant | null>;
  deleteVariant(productId: string, variantId: string, tenantId: string): Promise<boolean>;
  addMedia(
    productId: string,
    tenantId: string,
    asset: { key: string; url: string; mimeType: string; alt?: string | null }
  ): Promise<ProductDetail | null>;
}
