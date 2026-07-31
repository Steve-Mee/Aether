import type { DeployPort } from '../../application/ports/DeployPort';
import type { SiteRepository } from '../../domain/repositories/SiteRepository';
import {
  LocalFsArtifactStoreAdapter,
  resolveStorefrontArtifactsDir,
} from '../artifacts/LocalFsArtifactStoreAdapter';
import { StubDeployAdapter } from './StubDeployAdapter';
import { LocalEdgeDeployAdapter } from './LocalEdgeDeployAdapter';
import { CloudflareDeployAdapter } from './CloudflareDeployAdapter';
import { resolveStorefrontDeployProvider } from './deployProvider';

export function createStorefrontDeployAdapter(
  siteRepository: SiteRepository,
  artifacts: LocalFsArtifactStoreAdapter = new LocalFsArtifactStoreAdapter(
    resolveStorefrontArtifactsDir()
  )
): DeployPort {
  const provider = resolveStorefrontDeployProvider();
  if (provider === 'cloudflare') {
    return new CloudflareDeployAdapter(artifacts, siteRepository);
  }
  if (provider === 'local-edge') {
    return new LocalEdgeDeployAdapter(artifacts, siteRepository);
  }
  return new StubDeployAdapter(artifacts, siteRepository);
}
