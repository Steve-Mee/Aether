/**
 * Port for PUBLISH_STOREFRONT approvals.
 *
 * P03: PrismaPublishApprovalAdapter creates Approval rows:
 *   module = 'storefront-builder', actionType = 'PUBLISH_STOREFRONT'
 *   payload = { projectId, revisionId, qaScore }
 *
 * P07 ApprovalExecutor handler must:
 *   - canHandle('storefront-builder', 'PUBLISH_STOREFRONT')
 *   - call DeployPort.deploy({ projectId, revisionId })
 *   - on success set project.status='live', project.liveRevisionId=revisionId
 *   - NEVER auto-execute without human approval resolve
 */
export interface ProposePublishApprovalInput {
  tenantId: string;
  projectId: string;
  revisionId: string;
  qaScore?: number | null;
  requestedBy?: string;
}

export interface ProposePublishApprovalResult {
  id: string;
  type: 'PUBLISH_STOREFRONT';
  status: string;
  payload: {
    projectId: string;
    revisionId: string;
    qaScore?: number | null;
  };
}

export interface PublishApprovalPort {
  proposePublish(input: ProposePublishApprovalInput): Promise<ProposePublishApprovalResult>;
}
