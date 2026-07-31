import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { SiteProject } from '../../domain/entities/SiteProject';
import { SiteRepository } from '../../domain/repositories/SiteRepository';

export class GetSiteProjectUseCase {
  constructor(private readonly siteRepository: SiteRepository) {}

  async execute(tenantId: string, projectId: string): Promise<SiteProject | null> {
    const tid = requireTenantId(tenantId, 'GetSiteProjectUseCase.execute');
    return this.siteRepository.findProjectById(tid, projectId);
  }
}
