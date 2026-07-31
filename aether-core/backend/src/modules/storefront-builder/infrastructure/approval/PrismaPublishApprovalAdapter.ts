import { createApproval } from '../../../../shared/approval/approvalService';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import {
  ProposePublishApprovalInput,
  ProposePublishApprovalResult,
  PublishApprovalPort,
} from '../../application/ports/PublishApprovalPort';

/**
 * Persists PUBLISH_STOREFRONT approvals via shared Approval inbox.
 * Execute handler lands in P07 — this adapter only creates pending rows.
 */
export class PrismaPublishApprovalAdapter implements PublishApprovalPort {
  async proposePublish(input: ProposePublishApprovalInput): Promise<ProposePublishApprovalResult> {
    requireTenantId(input.tenantId, 'PrismaPublishApprovalAdapter.proposePublish');

    const payload = {
      projectId: input.projectId,
      revisionId: input.revisionId,
      qaScore: input.qaScore ?? null,
    };

    const approval = await createApproval({
      tenantId: input.tenantId,
      module: 'storefront-builder',
      actionType: 'PUBLISH_STOREFRONT',
      payload,
      requestedBy: input.requestedBy,
    });

    return {
      id: approval.id,
      type: 'PUBLISH_STOREFRONT',
      status: approval.status,
      payload,
    };
  }
}
