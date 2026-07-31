import * as path from 'path';
import { isStorefrontDeployEnabled } from './deployEnv';

export type StorefrontDeployProviderName = 'stub' | 'local-edge' | 'cloudflare';

/**
 * Deploy provider selection.
 * - unset / stub: StubDeployAdapter (Birth default)
 * - local-edge: CDN-layout local filesystem (CI-safe)
 * - cloudflare: R2 upload (requires CF_* credentials; fail-closed)
 *
 * When STOREFRONT_DEPLOY_ENABLED=true and provider unset → local-edge (pilot default).
 */
export function resolveStorefrontDeployProvider(
  env: NodeJS.ProcessEnv = process.env
): StorefrontDeployProviderName {
  const raw = (env.STOREFRONT_DEPLOY_PROVIDER ?? '').trim().toLowerCase();
  if (raw === 'cloudflare') return 'cloudflare';
  if (raw === 'local-edge' || raw === 'local_edge' || raw === 'edge') return 'local-edge';
  if (raw === 'stub') return 'stub';
  if (isStorefrontDeployEnabled(env)) return 'local-edge';
  return 'stub';
}

export function resolveStorefrontEdgeRoot(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.STOREFRONT_EDGE_ROOT?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
  }
  return path.resolve(process.cwd(), 'tmp', 'storefront-edge');
}

export function resolveStorefrontEdgePublicBase(env: NodeJS.ProcessEnv = process.env): string {
  const base = env.STOREFRONT_EDGE_PUBLIC_BASE?.trim();
  if (base) return base.replace(/\/$/, '');
  return 'http://localhost:4177/edge';
}
