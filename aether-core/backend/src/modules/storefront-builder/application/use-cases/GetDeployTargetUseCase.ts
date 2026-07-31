import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { DeployTarget } from '../../domain/entities/DeployTarget';
import { SiteRepository } from '../../domain/repositories/SiteRepository';
import { ProjectNotFoundError } from './CreateRevisionUseCase';

export class GetDeployTargetUseCase {
  constructor(private readonly siteRepository: SiteRepository) {}

  async execute(tenantId: string, projectId: string): Promise<DeployTarget | null> {
    const tid = requireTenantId(tenantId, 'GetDeployTargetUseCase.execute');
    const project = await this.siteRepository.findProjectById(tid, projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }
    return this.siteRepository.findDeployTarget(tid, projectId);
  }
}
