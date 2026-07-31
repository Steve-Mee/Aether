import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { SitePage } from '../../domain/entities/SitePage';
import { SiteRepository } from '../../domain/repositories/SiteRepository';

export class GetPageUseCase {
  constructor(private readonly siteRepository: SiteRepository) {}

  async execute(tenantId: string, pageId: string): Promise<SitePage | null> {
    const tid = requireTenantId(tenantId, 'GetPageUseCase.execute');
    return this.siteRepository.findPageById(tid, pageId);
  }
}
