import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import {
  ProposePublishApprovalResult,
  PublishApprovalPort,
} from '../ports/PublishApprovalPort';
import { SiteRepository } from '../../domain/repositories/SiteRepository';
import { RevisionNotFoundError } from './ListPagesUseCase';

/** Locked Birth gate: propose publish rejects below this score (Appendix G). */
export const QA_PUBLISH_THRESHOLD = 0.8;

export class QaBelowThresholdError extends Error {
  readonly qaScore: number | null;

  constructor(qaScore: number | null) {
    super(
      qaScore === null
        ? `QA score missing; minimum ${QA_PUBLISH_THRESHOLD} required to propose publish`
        : `QA score ${qaScore} is below threshold ${QA_PUBLISH_THRESHOLD}`
    );
    this.name = 'QaBelowThresholdError';
    this.qaScore = qaScore;
  }
}

/**
 * Creates a pending PUBLISH_STOREFRONT approval — never deploys directly.
 */
export class ProposePublishUseCase {
  constructor(
    private readonly siteRepository: SiteRepository,
    private readonly publishApproval: PublishApprovalPort
  ) {}

  async execute(
    tenantId: string,
    revisionId: string,
    opts: { requestedBy?: string } = {}
  ): Promise<{ approval: ProposePublishApprovalResult }> {
    const tid = requireTenantId(tenantId, 'ProposePublishUseCase.execute');
    const revision = await this.siteRepository.findRevisionById(tid, revisionId);
    if (!revision) {
      throw new RevisionNotFoundError(revisionId);
    }

    const rawScore =
      revision.qaReportJson &&
      typeof revision.qaReportJson === 'object' &&
      revision.qaReportJson !== null &&
      'score' in revision.qaReportJson
        ? Number((revision.qaReportJson as { score?: unknown }).score)
        : null;
    const qaScore = Number.isFinite(rawScore) ? (rawScore as number) : null;

    if (qaScore === null || qaScore < QA_PUBLISH_THRESHOLD) {
      throw new QaBelowThresholdError(qaScore);
    }

    const approval = await this.publishApproval.proposePublish({
      tenantId: tid,
      projectId: revision.projectId,
      revisionId: revision.id,
      qaScore,
      requestedBy: opts.requestedBy,
    });

    return { approval };
  }
}
