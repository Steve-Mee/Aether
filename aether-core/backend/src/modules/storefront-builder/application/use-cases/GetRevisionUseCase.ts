import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { SiteRevision } from '../../domain/entities/SiteRevision';
import { SiteRepository } from '../../domain/repositories/SiteRepository';

export class GetRevisionUseCase {
  constructor(private readonly siteRepository: SiteRepository) {}

  async execute(tenantId: string, revisionId: string): Promise<SiteRevision | null> {
    const tid = requireTenantId(tenantId, 'GetRevisionUseCase.execute');
    return this.siteRepository.findRevisionById(tid, revisionId);
  }
}
