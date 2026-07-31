import { SiteProject } from '../../domain/entities/SiteProject';
import { SiteRevision } from '../../domain/entities/SiteRevision';
import { SiteRepository } from '../../domain/repositories/SiteRepository';
import {
  InvalidStorefrontSlugError,
  parseStorefrontSlug,
} from '../../domain/validateStorefrontSlug';
import {
  extractPreviewTokenFromAuthHeader,
  PreviewTokenError,
  verifyPreviewToken,
} from './previewToken';

export class SiteNotFoundError extends Error {
  constructor(slug: string) {
    super(`Storefront site not found: ${slug}`);
    this.name = 'SiteNotFoundError';
  }
}

export class SiteNotLiveError extends Error {
  constructor(slug: string) {
    super(`Storefront site has no live revision: ${slug}`);
    this.name = 'SiteNotLiveError';
  }
}

export interface PublicStorefrontContext {
  project: SiteProject;
  revision: SiteRevision;
  mode: 'live' | 'preview';
}

/** Fail-closed slug gate — invalid shape maps to SiteNotFound (no validation leak). */
function requirePublicSlug(tenantSlug: string): string {
  try {
    return parseStorefrontSlug(tenantSlug);
  } catch (err) {
    if (err instanceof InvalidStorefrontSlugError) {
      throw new SiteNotFoundError(tenantSlug);
    }
    throw err;
  }
}

/**
 * Resolve SiteProject by public slug, then liveRevisionId or Preview token revision.
 * Preview tokens are scoped to projectId + tenantId — no cross-tenant escalation.
 */
export async function resolvePublicStorefront(
  siteRepository: SiteRepository,
  tenantSlug: string,
  authorizationHeader?: string
): Promise<PublicStorefrontContext> {
  const slug = requirePublicSlug(tenantSlug);
  const project = await siteRepository.findProjectByPublicSlug(slug);
  if (!project) {
    throw new SiteNotFoundError(tenantSlug);
  }

  const previewToken = extractPreviewTokenFromAuthHeader(authorizationHeader);
  if (previewToken) {
    let claims;
    try {
      claims = verifyPreviewToken(previewToken);
    } catch (err) {
      if (err instanceof PreviewTokenError) throw err;
      throw new PreviewTokenError('Invalid preview token', 'PREVIEW_TOKEN_INVALID');
    }

    if (claims.projectId !== project.id || claims.tenantId !== project.tenantId) {
      // Do not leak whether the token belongs to another tenant.
      throw new PreviewTokenError(
        'Preview token does not match site',
        'PREVIEW_TOKEN_INVALID'
      );
    }

    const revision = await siteRepository.findRevisionById(
      project.tenantId,
      claims.revisionId
    );
    if (!revision || revision.projectId !== project.id) {
      throw new PreviewTokenError(
        'Preview revision not found for site',
        'PREVIEW_TOKEN_INVALID'
      );
    }

    return { project, revision, mode: 'preview' };
  }

  // Corrupt live claim without pointer — fail closed (do not advertise SITE_NOT_LIVE).
  if (project.status === 'live' && !project.liveRevisionId) {
    throw new SiteNotFoundError(tenantSlug);
  }

  if (!project.liveRevisionId || project.status !== 'live') {
    throw new SiteNotLiveError(slug);
  }

  const revision = await siteRepository.findRevisionById(
    project.tenantId,
    project.liveRevisionId
  );
  if (!revision || revision.projectId !== project.id) {
    // Pointer dangling — treat as not found (broken live pointer).
    throw new SiteNotFoundError(tenantSlug);
  }

  // Dead-man: live without compiled artifacts → fail closed (rebuild required).
  if (!revision.artifactsPath?.trim()) {
    throw new SiteNotFoundError(tenantSlug);
  }

  return { project, revision, mode: 'live' };
}

/** Resolve project by slug only (catalog/product — no revision required). */
export async function resolvePublicStorefrontProject(
  siteRepository: SiteRepository,
  tenantSlug: string
): Promise<SiteProject> {
  const slug = requirePublicSlug(tenantSlug);
  const project = await siteRepository.findProjectByPublicSlug(slug);
  if (!project) {
    throw new SiteNotFoundError(tenantSlug);
  }
  return project;
}
