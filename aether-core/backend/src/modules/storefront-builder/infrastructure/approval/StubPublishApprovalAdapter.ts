import { randomUUID } from 'crypto';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import {
  ProposePublishApprovalInput,
  ProposePublishApprovalResult,
  PublishApprovalPort,
} from '../../application/ports/PublishApprovalPort';

/**
 * In-memory approval stub — does not write Approval rows (P03/P07).
 */
export class StubPublishApprovalAdapter implements PublishApprovalPort {
  async proposePublish(input: ProposePublishApprovalInput): Promise<ProposePublishApprovalResult> {
    requireTenantId(input.tenantId, 'StubPublishApprovalAdapter.proposePublish');
    return {
      id: `stub_appr_${randomUUID()}`,
      type: 'PUBLISH_STOREFRONT',
      status: 'pending',
      payload: {
        projectId: input.projectId,
        revisionId: input.revisionId,
        qaScore: input.qaScore ?? null,
      },
    };
  }
}
