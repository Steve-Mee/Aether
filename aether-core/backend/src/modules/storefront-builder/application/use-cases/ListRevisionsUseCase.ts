import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { SiteRevision } from '../../domain/entities/SiteRevision';
import { SiteRepository } from '../../domain/repositories/SiteRepository';
import { ProjectNotFoundError } from './CreateRevisionUseCase';

export class ListRevisionsUseCase {
  constructor(private readonly siteRepository: SiteRepository) {}

  async execute(tenantId: string, projectId: string): Promise<SiteRevision[]> {
    const tid = requireTenantId(tenantId, 'ListRevisionsUseCase.execute');
    const project = await this.siteRepository.findProjectById(tid, projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }
    return this.siteRepository.listRevisions(tid, projectId);
  }
}
