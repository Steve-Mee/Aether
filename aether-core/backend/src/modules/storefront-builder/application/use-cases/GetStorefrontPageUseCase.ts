import { SitePage } from '../../domain/entities/SitePage';
import { SiteRepository } from '../../domain/repositories/SiteRepository';
import { resolvePublicStorefront } from '../services/resolvePublicStorefront';

export class PageNotFoundError extends Error {
  constructor(path: string) {
    super(`Storefront page not found: ${path}`);
    this.name = 'PageNotFoundError';
  }
}

export class GetStorefrontPageUseCase {
  constructor(private readonly siteRepository: SiteRepository) {}

  async execute(
    tenantSlug: string,
    path: string,
    authorizationHeader?: string
  ): Promise<SitePage> {
    const ctx = await resolvePublicStorefront(
      this.siteRepository,
      tenantSlug,
      authorizationHeader
    );

    const page = await this.siteRepository.findPageByPath(
      ctx.project.tenantId,
      ctx.revision.id,
      path
    );
    if (!page) {
      throw new PageNotFoundError(path);
    }
    return page;
  }
}
