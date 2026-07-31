import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { SitePage } from '../../domain/entities/SitePage';
import { SiteRepository } from '../../domain/repositories/SiteRepository';

export class RevisionNotFoundError extends Error {
  constructor(revisionId: string) {
    super(`Site revision not found: ${revisionId}`);
    this.name = 'RevisionNotFoundError';
  }
}

export class ListPagesUseCase {
  constructor(private readonly siteRepository: SiteRepository) {}

  async execute(tenantId: string, revisionId: string): Promise<SitePage[]> {
    const tid = requireTenantId(tenantId, 'ListPagesUseCase.execute');
    const revision = await this.siteRepository.findRevisionById(tid, revisionId);
    if (!revision) {
      throw new RevisionNotFoundError(revisionId);
    }
    return this.siteRepository.listPages(tid, revisionId);
  }
}
