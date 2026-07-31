import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { DeployTarget } from '../../domain/entities/DeployTarget';
import { SiteRepository } from '../../domain/repositories/SiteRepository';
import { ProjectNotFoundError } from './CreateRevisionUseCase';

export class UpsertDeployTargetUseCase {
  constructor(private readonly siteRepository: SiteRepository) {}

  async execute(
    tenantId: string,
    projectId: string,
    data: { provider: string; liveUrl?: string | null; configJson?: unknown | null }
  ): Promise<DeployTarget> {
    const tid = requireTenantId(tenantId, 'UpsertDeployTargetUseCase.execute');
    const project = await this.siteRepository.findProjectById(tid, projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    const provider = data.provider?.trim();
    if (!provider) {
      throw new Error('provider is required');
    }

    return this.siteRepository.upsertDeployTarget(tid, projectId, {
      provider,
      liveUrl: data.liveUrl ?? null,
      configJson: data.configJson ?? null,
    });
  }
}
