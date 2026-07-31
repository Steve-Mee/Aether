import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { SiteProject } from '../../domain/entities/SiteProject';
import { SiteRepository } from '../../domain/repositories/SiteRepository';

export class ListSiteProjectsUseCase {
  constructor(private readonly siteRepository: SiteRepository) {}

  async execute(tenantId: string): Promise<SiteProject[]> {
    const tid = requireTenantId(tenantId, 'ListSiteProjectsUseCase.execute');
    return this.siteRepository.listProjects(tid);
  }
}
