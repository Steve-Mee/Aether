import { logger } from '../../../../shared/logging/logger';
import { DeployInput, DeployPort, DeployResult } from '../../application/ports/DeployPort';
import type { SiteRepository } from '../../domain/repositories/SiteRepository';
import {
  LocalFsArtifactStoreAdapter,
  resolveStorefrontArtifactsDir,
} from '../artifacts/LocalFsArtifactStoreAdapter';
import { resolveStorefrontPreviewPort } from '../preview/LocalPreviewHostAdapter';
import { isStorefrontDeployEnabled } from './deployEnv';

export { isStorefrontDeployEnabled } from './deployEnv';

export type StubDeploySiteRepository = Pick<SiteRepository, 'markProjectLive'>;

/**
 * Local/CI DeployPort (P07 + P08).
 *
 * - Writes live revision pointer under STOREFRONT_ARTIFACTS_DIR (no CDN).
 * - ALWAYS sets SiteProject.status=live + liveRevisionId (Appendix G).
 * - STOREFRONT_DEPLOY_ENABLED=false (default): staged=true; pointer + DB live still written.
 * - STOREFRONT_DEPLOY_ENABLED=true: staged=false; emit log `deploy.provider=stub` only (no CDN).
 */
export class StubDeployAdapter implements DeployPort {
  constructor(
    private readonly artifacts: LocalFsArtifactStoreAdapter = new LocalFsArtifactStoreAdapter(
      resolveStorefrontArtifactsDir()
    ),
    private readonly siteRepository?: StubDeploySiteRepository
  ) {}

  async deploy(input: DeployInput): Promise<DeployResult> {
    if (!input.tenantId?.trim()) {
      throw new Error('tenantId is required for stub deploy');
    }
    if (!input.projectId?.trim()) {
      throw new Error('projectId is required for stub deploy');
    }
    if (!input.revisionId?.trim()) {
      throw new Error('revisionId is required for stub deploy');
    }
    if (!this.siteRepository) {
      throw new Error('SiteRepository is required for stub deploy (mark live)');
    }

    await this.artifacts.writeLivePointer({
      tenantId: input.tenantId,
      projectId: input.projectId,
      revisionId: input.revisionId,
    });

    const enabled = isStorefrontDeployEnabled();
    const port = resolveStorefrontPreviewPort();
    const liveUrl = `http://localhost:${port}/live/${input.projectId}`;

    await this.siteRepository.markProjectLive(
      input.tenantId,
      input.projectId,
      input.revisionId,
      { liveUrl, provider: 'stub' }
    );

    if (enabled) {
      logger.info('deploy.provider=stub', {
        tenantId: input.tenantId,
        projectId: input.projectId,
        revisionId: input.revisionId,
        provider: 'stub',
      });
    }

    return {
      liveUrl,
      staged: !enabled,
      provider: 'stub',
    };
  }
}
