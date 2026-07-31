export interface DeployInput {
  tenantId: string;
  projectId: string;
  revisionId: string;
  provider?: string;
}

export interface DeployResult {
  liveUrl: string;
  /**
   * When `STOREFRONT_DEPLOY_ENABLED` is not `true`, deploy still writes
   * the artifact live pointer and DB live fields, but reports staged=true.
   * Providers: stub | local-edge | cloudflare (see STOREFRONT_DEPLOY_PROVIDER).
   */
  staged?: boolean;
  /** Provider that performed the deploy. */
  provider?: string;
}

/**
 * Promote a revision to the live edge.
 * Called only from ApprovalExecutor after PUBLISH_STOREFRONT approval — never from propose tools.
 *
 * StubDeployAdapter side effects (always, regardless of STOREFRONT_DEPLOY_ENABLED):
 * artifact live pointer + SiteProject.status=live + liveRevisionId.
 */
export interface DeployPort {
  deploy(input: DeployInput): Promise<DeployResult>;
}
