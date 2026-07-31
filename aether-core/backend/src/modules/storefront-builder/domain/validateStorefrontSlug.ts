/**
 * DNS-safe public storefront slug (tenantSlug / SiteProject.slug).
 * Prevents path injection and ambiguous host labels.
 * Single source of truth — API Zod schemas must call parseStorefrontSlug, not re-declare the regex.
 */
const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

export const STOREFRONT_SLUG_MESSAGE =
  'slug must be DNS-safe lowercase (letters, digits, hyphens)';

export class InvalidStorefrontSlugError extends Error {
  constructor(slug: string) {
    super(
      `Invalid storefront slug "${slug}": use 1–63 lowercase letters, digits, hyphens; no leading/trailing hyphen`
    );
    this.name = 'InvalidStorefrontSlugError';
  }
}

export function isValidStorefrontSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;
  if (slug.length < 1 || slug.length > 63) return false;
  if (slug.includes('..') || slug.includes('/') || slug.includes('\\')) return false;
  return SLUG_RE.test(slug);
}

/** Normalize + validate; throws InvalidStorefrontSlugError on failure. */
export function parseStorefrontSlug(raw: string): string {
  const slug = raw?.trim().toLowerCase() ?? '';
  if (!isValidStorefrontSlug(slug)) {
    throw new InvalidStorefrontSlugError(raw ?? '');
  }
  return slug;
}

/** Zod refine helper — keeps HTTP validation aligned with parseStorefrontSlug. */
export function storefrontSlugZodCheck(raw: string): boolean {
  try {
    parseStorefrontSlug(raw);
    return true;
  } catch {
    return false;
  }
}
