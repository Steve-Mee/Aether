import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import {
  StorefrontCatalogListOptions,
  StorefrontCatalogListResult,
  StorefrontCatalogPort,
  StorefrontCatalogProduct,
} from '../../application/ports/StorefrontCatalogPort';

/**
 * Empty catalog stub for unit tests / offline composition.
 * Runtime composition uses PrismaStorefrontCatalogAdapter.
 */
export class StubStorefrontCatalogAdapter implements StorefrontCatalogPort {
  async listProducts(
    tenantId: string,
    _opts?: StorefrontCatalogListOptions
  ): Promise<StorefrontCatalogListResult> {
    requireTenantId(tenantId, 'StubStorefrontCatalogAdapter.listProducts');
    return { products: [], nextCursor: null };
  }

  async getProductBySlug(
    tenantId: string,
    _slug: string
  ): Promise<StorefrontCatalogProduct | null> {
    requireTenantId(tenantId, 'StubStorefrontCatalogAdapter.getProductBySlug');
    return null;
  }

  async getProductById(
    tenantId: string,
    _productId: string
  ): Promise<StorefrontCatalogProduct | null> {
    requireTenantId(tenantId, 'StubStorefrontCatalogAdapter.getProductById');
    return null;
  }

  async decrementStock(
    tenantId: string,
    _lines: Array<{ productId: string; variantId?: string | null; quantity: number }>
  ): Promise<void> {
    requireTenantId(tenantId, 'StubStorefrontCatalogAdapter.decrementStock');
  }
}
