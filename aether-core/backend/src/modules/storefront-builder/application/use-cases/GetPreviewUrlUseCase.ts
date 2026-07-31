import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { PREVIEW_TOKEN_TTL_MS } from '../services/previewToken';
import { PreviewHostPort } from '../ports/PreviewHostPort';
import { SiteRepository } from '../../domain/repositories/SiteRepository';
import { RevisionNotFoundError } from './ListPagesUseCase';

export class GetPreviewUrlUseCase {
  constructor(
    private readonly siteRepository: SiteRepository,
    private readonly previewHost: PreviewHostPort
  ) {}

  async execute(
    tenantId: string,
    revisionId: string
  ): Promise<{ previewUrl: string; expiresAt: string }> {
    const tid = requireTenantId(tenantId, 'GetPreviewUrlUseCase.execute');
    const revision = await this.siteRepository.findRevisionById(tid, revisionId);
    if (!revision) {
      throw new RevisionNotFoundError(revisionId);
    }

    const result = await this.previewHost.startPreview({
      tenantId: tid,
      projectId: revision.projectId,
      revisionId: revision.id,
      artifactsPath: revision.artifactsPath,
    });

    const expiresAt =
      result.expiresAt?.toISOString() ??
      new Date(Date.now() + PREVIEW_TOKEN_TTL_MS).toISOString();

    // LocalPreviewHostAdapter always includes a signed token; keep stub suffix for Noop.
    const previewUrl = result.previewUrl.includes('token=')
      ? result.previewUrl
      : `${result.previewUrl}${result.previewUrl.includes('?') ? '&' : '?'}token=stub`;

    return { previewUrl, expiresAt };
  }
}
