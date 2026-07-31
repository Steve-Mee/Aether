import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { BuildJob } from '../../domain/entities/BuildJob';
import { SiteRepository } from '../../domain/repositories/SiteRepository';

export class GetBuildJobUseCase {
  constructor(private readonly siteRepository: SiteRepository) {}

  async execute(tenantId: string, buildJobId: string): Promise<BuildJob | null> {
    const tid = requireTenantId(tenantId, 'GetBuildJobUseCase.execute');
    return this.siteRepository.findBuildJobById(tid, buildJobId);
  }
}
