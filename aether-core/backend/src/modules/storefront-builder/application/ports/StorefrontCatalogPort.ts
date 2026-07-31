export interface StorefrontCatalogVariant {
  id: string;
  sku: string;
  price: number;
  currency: string;
  stock: number;
}

export interface StorefrontCatalogProduct {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  currency: string;
  stock: number;
  imageUrl?: string | null;
  status?: string;
  variants?: StorefrontCatalogVariant[];
}

export interface StorefrontCatalogListOptions {
  limit?: number;
  cursor?: string | null;
}

export interface StorefrontCatalogListResult {
  products: StorefrontCatalogProduct[];
  nextCursor: string | null;
}

/**
 * Read products for codegen context / public storefront (catalog truth stays in Core).
 */
export interface StorefrontCatalogPort {
  listProducts(
    tenantId: string,
    opts?: StorefrontCatalogListOptions
  ): Promise<StorefrontCatalogListResult>;
  getProductBySlug(tenantId: string, slug: string): Promise<StorefrontCatalogProduct | null>;
  /** Tenant-scoped product by id (cart stock / pricing). */
  getProductById(tenantId: string, productId: string): Promise<StorefrontCatalogProduct | null>;
  /** Decrement product (and optional variant) stock after successful checkout. */
  decrementStock(
    tenantId: string,
    lines: Array<{ productId: string; variantId?: string | null; quantity: number }>
  ): Promise<void>;
}
