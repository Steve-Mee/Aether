import { logger } from '../../../../shared/logging/logger';
import { DeployInput, DeployPort, DeployResult } from '../../application/ports/DeployPort';
import type { SiteRepository } from '../../domain/repositories/SiteRepository';
import {
  LocalFsArtifactStoreAdapter,
  resolveStorefrontArtifactsDir,
} from '../artifacts/LocalFsArtifactStoreAdapter';
import { isStorefrontDeployEnabled } from './deployEnv';

export type CloudflareSiteRepository = Pick<SiteRepository, 'markProjectLive' | 'findProjectById'>;

export interface CloudflareHttpPort {
  putObject(input: {
    accountId: string;
    bucket: string;
    objectKey: string;
    body: Buffer;
    contentType?: string;
    apiToken: string;
  }): Promise<void>;
}

/** Minimal R2 S3-compatible PUT via Cloudflare API (fetch). */
export class CloudflareR2HttpAdapter implements CloudflareHttpPort {
  async putObject(input: {
    accountId: string;
    bucket: string;
    objectKey: string;
    body: Buffer;
    contentType?: string;
    apiToken: string;
  }): Promise<void> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${input.accountId}/r2/buckets/${input.bucket}/objects/${encodeURIComponent(input.objectKey)}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${input.apiToken}`,
        'Content-Type': input.contentType ?? 'application/octet-stream',
      },
      body: input.body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Cloudflare R2 upload failed (${res.status}): ${text.slice(0, 200)}`);
    }
  }
}

function requireCfEnv(env: NodeJS.ProcessEnv = process.env): {
  accountId: string;
  apiToken: string;
  bucket: string;
  publicBase: string;
} {
  const accountId = env.CF_ACCOUNT_ID?.trim();
  const apiToken = env.CF_API_TOKEN?.trim();
  const bucket = env.CF_R2_BUCKET?.trim();
  const publicBase = env.CF_R2_PUBLIC_BASE?.trim() || env.STOREFRONT_EDGE_PUBLIC_BASE?.trim();
  if (!accountId || !apiToken || !bucket) {
    throw new Error(
      'Cloudflare deploy requires CF_ACCOUNT_ID, CF_API_TOKEN, and CF_R2_BUCKET (fail-closed)'
    );
  }
  if (!publicBase) {
    throw new Error('Cloudflare deploy requires CF_R2_PUBLIC_BASE or STOREFRONT_EDGE_PUBLIC_BASE');
  }
  return { accountId, apiToken, bucket, publicBase: publicBase.replace(/\/$/, '') };
}

/**
 * Cloudflare R2 edge deploy. Fail-closed without credentials — never silently stubs as CDN.
 */
export class CloudflareDeployAdapter implements DeployPort {
  constructor(
    private readonly artifacts: LocalFsArtifactStoreAdapter = new LocalFsArtifactStoreAdapter(
      resolveStorefrontArtifactsDir()
    ),
    private readonly siteRepository?: CloudflareSiteRepository,
    private readonly http: CloudflareHttpPort = new CloudflareR2HttpAdapter(),
    private readonly env: NodeJS.ProcessEnv = process.env
  ) {}

  async deploy(input: DeployInput): Promise<DeployResult> {
    if (!input.tenantId?.trim()) throw new Error('tenantId is required for cloudflare deploy');
    if (!input.projectId?.trim()) throw new Error('projectId is required for cloudflare deploy');
    if (!input.revisionId?.trim()) throw new Error('revisionId is required for cloudflare deploy');
    if (!this.siteRepository) {
      throw new Error('SiteRepository is required for cloudflare deploy');
    }

    const cf = requireCfEnv(this.env);
    const project = await this.siteRepository.findProjectById(input.tenantId, input.projectId);
    if (!project) throw new Error(`Site project not found: ${input.projectId}`);

    await this.artifacts.writeLivePointer({
      tenantId: input.tenantId,
      projectId: input.projectId,
      revisionId: input.revisionId,
    });

    const files = await this.artifacts.list(input.revisionId);
    for (const rel of files) {
      const buf = await this.artifacts.read(input.revisionId, rel);
      if (!buf) continue;
      const objectKey = `${project.slug}/${rel.replace(/\\/g, '/')}`;
      await this.http.putObject({
        accountId: cf.accountId,
        bucket: cf.bucket,
        objectKey,
        body: buf,
        apiToken: cf.apiToken,
      });
    }

    const meta = Buffer.from(
      JSON.stringify({
        tenantId: input.tenantId,
        projectId: input.projectId,
        revisionId: input.revisionId,
        slug: project.slug,
        provider: 'cloudflare',
        updatedAt: new Date().toISOString(),
      }),
      'utf8'
    );
    await this.http.putObject({
      accountId: cf.accountId,
      bucket: cf.bucket,
      objectKey: `${project.slug}/_edge.json`,
      body: meta,
      contentType: 'application/json',
      apiToken: cf.apiToken,
    });

    const liveUrl = `${cf.publicBase}/${project.slug}`;
    const enabled = isStorefrontDeployEnabled(this.env);

    await this.siteRepository.markProjectLive(
      input.tenantId,
      input.projectId,
      input.revisionId,
      { liveUrl, provider: 'cloudflare' }
    );

    logger.info('deploy.provider=cloudflare', {
      tenantId: input.tenantId,
      projectId: input.projectId,
      revisionId: input.revisionId,
      slug: project.slug,
      liveUrl,
      staged: !enabled,
    });

    return {
      liveUrl,
      staged: !enabled,
      provider: 'cloudflare',
    };
  }
}
