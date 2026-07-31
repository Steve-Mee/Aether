import { SiteRepository } from '../../domain/repositories/SiteRepository';
import { resolvePublicStorefront } from '../services/resolvePublicStorefront';

export interface StorefrontSiteDto {
  slug: string;
  status: string;
  revisionId: string;
  locales: string[];
  tokens: { primary?: string; accent?: string; [key: string]: unknown };
  mode: 'live' | 'preview';
}

function extractLocales(briefJson: unknown): string[] {
  if (!briefJson || typeof briefJson !== 'object') return ['nl-NL'];
  const brief = briefJson as Record<string, unknown>;
  if (Array.isArray(brief.locales) && brief.locales.every((x) => typeof x === 'string')) {
    return brief.locales as string[];
  }
  if (typeof brief.localeDefault === 'string') return [brief.localeDefault];
  return ['nl-NL'];
}

function extractTokens(briefJson: unknown): StorefrontSiteDto['tokens'] {
  if (!briefJson || typeof briefJson !== 'object') return {};
  const brief = briefJson as Record<string, unknown>;
  const brand =
    brief.brand && typeof brief.brand === 'object'
      ? (brief.brand as Record<string, unknown>)
      : null;
  const tokens: StorefrontSiteDto['tokens'] = {};
  if (brand) {
    if (typeof brand.primaryColor === 'string') tokens.primary = brand.primaryColor;
    if (typeof brand.accentColor === 'string') tokens.accent = brand.accentColor;
  }
  return tokens;
}

export class ResolveStorefrontSiteUseCase {
  constructor(private readonly siteRepository: SiteRepository) {}

  async execute(
    tenantSlug: string,
    authorizationHeader?: string
  ): Promise<StorefrontSiteDto> {
    const ctx = await resolvePublicStorefront(
      this.siteRepository,
      tenantSlug,
      authorizationHeader
    );

    return {
      slug: ctx.project.slug,
      status: ctx.project.status,
      revisionId: ctx.revision.id,
      locales: extractLocales(ctx.revision.briefJson),
      tokens: extractTokens(ctx.revision.briefJson),
      mode: ctx.mode,
    };
  }
}
