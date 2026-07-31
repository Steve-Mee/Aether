import { SiteRepository } from '../../domain/repositories/SiteRepository';
import {
  StorefrontCatalogListResult,
  StorefrontCatalogPort,
} from '../ports/StorefrontCatalogPort';
import { resolvePublicStorefrontProject } from '../services/resolvePublicStorefront';

export class GetStorefrontCatalogUseCase {
  constructor(
    private readonly siteRepository: SiteRepository,
    private readonly catalog: StorefrontCatalogPort
  ) {}

  async execute(
    tenantSlug: string,
    opts?: { limit?: number; cursor?: string | null }
  ): Promise<StorefrontCatalogListResult> {
    const project = await resolvePublicStorefrontProject(this.siteRepository, tenantSlug);
    return this.catalog.listProducts(project.tenantId, opts);
  }
}
