import { SiteRepository } from '../../domain/repositories/SiteRepository';
import {
  StorefrontCatalogPort,
  StorefrontCatalogProduct,
} from '../ports/StorefrontCatalogPort';
import { resolvePublicStorefrontProject } from '../services/resolvePublicStorefront';

export class ProductNotFoundError extends Error {
  constructor(slug: string) {
    super(`Storefront product not found: ${slug}`);
    this.name = 'ProductNotFoundError';
  }
}

export class GetStorefrontProductUseCase {
  constructor(
    private readonly siteRepository: SiteRepository,
    private readonly catalog: StorefrontCatalogPort
  ) {}

  async execute(tenantSlug: string, productSlug: string): Promise<StorefrontCatalogProduct> {
    const project = await resolvePublicStorefrontProject(this.siteRepository, tenantSlug);
    const product = await this.catalog.getProductBySlug(project.tenantId, productSlug);
    if (!product) {
      throw new ProductNotFoundError(productSlug);
    }
    return product;
  }
}
