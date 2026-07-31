import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../../../../shared/logging/logger';
import { DeployInput, DeployPort, DeployResult } from '../../application/ports/DeployPort';
import type { SiteRepository } from '../../domain/repositories/SiteRepository';
import {
  LocalFsArtifactStoreAdapter,
  resolveStorefrontArtifactsDir,
} from '../artifacts/LocalFsArtifactStoreAdapter';
import { isStorefrontDeployEnabled } from './deployEnv';
import {
  resolveStorefrontEdgePublicBase,
  resolveStorefrontEdgeRoot,
} from './deployProvider';

export type LocalEdgeSiteRepository = Pick<SiteRepository, 'markProjectLive' | 'findProjectById'>;

/**
 * Local CDN-layout deploy: copies revision artifacts to STOREFRONT_EDGE_ROOT/{slug}/
 * and marks the project live. CI-safe (no cloud credentials).
 */
export class LocalEdgeDeployAdapter implements DeployPort {
  constructor(
    private readonly artifacts: LocalFsArtifactStoreAdapter = new LocalFsArtifactStoreAdapter(
      resolveStorefrontArtifactsDir()
    ),
    private readonly siteRepository?: LocalEdgeSiteRepository,
    private readonly edgeRoot: string = resolveStorefrontEdgeRoot(),
    private readonly publicBase: string = resolveStorefrontEdgePublicBase()
  ) {}

  async deploy(input: DeployInput): Promise<DeployResult> {
    if (!input.tenantId?.trim()) throw new Error('tenantId is required for local-edge deploy');
    if (!input.projectId?.trim()) throw new Error('projectId is required for local-edge deploy');
    if (!input.revisionId?.trim()) throw new Error('revisionId is required for local-edge deploy');
    if (!this.siteRepository) {
      throw new Error('SiteRepository is required for local-edge deploy');
    }

    const project = await this.siteRepository.findProjectById(input.tenantId, input.projectId);
    if (!project) {
      throw new Error(`Site project not found: ${input.projectId}`);
    }

    await this.artifacts.writeLivePointer({
      tenantId: input.tenantId,
      projectId: input.projectId,
      revisionId: input.revisionId,
    });

    const slug = project.slug;
    const destRoot = path.resolve(this.edgeRoot, slug);
    // Prevent path escape via slug
    if (!destRoot.startsWith(path.resolve(this.edgeRoot))) {
      throw new Error('Invalid edge slug path');
    }

    await fs.mkdir(destRoot, { recursive: true });
    const files = await this.artifacts.list(input.revisionId);
    for (const rel of files) {
      const buf = await this.artifacts.read(input.revisionId, rel);
      if (!buf) continue;
      const dest = path.resolve(destRoot, rel);
      if (!dest.startsWith(destRoot)) throw new Error('Path escape in edge copy');
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, buf);
    }

    await fs.writeFile(
      path.join(destRoot, '_edge.json'),
      `${JSON.stringify(
        {
          tenantId: input.tenantId,
          projectId: input.projectId,
          revisionId: input.revisionId,
          slug,
          provider: 'local-edge',
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      )}\n`
    );

    const liveUrl = `${this.publicBase}/${slug}`;
    const enabled = isStorefrontDeployEnabled();

    await this.siteRepository.markProjectLive(
      input.tenantId,
      input.projectId,
      input.revisionId,
      { liveUrl, provider: 'local-edge' }
    );

    logger.info('deploy.provider=local-edge', {
      tenantId: input.tenantId,
      projectId: input.projectId,
      revisionId: input.revisionId,
      slug,
      liveUrl,
      staged: !enabled,
    });

    return {
      liveUrl,
      staged: !enabled,
      provider: 'local-edge',
    };
  }
}
