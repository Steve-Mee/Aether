/**
 * Charter allowlist — must stay in sync with storefront-builder.md §4.3
 * and storefront-runtime block registry (P09).
 */
export const ALLOWLISTED_BLOCK_TYPES = [
  'Hero',
  'LogoBar',
  'ProductGrid',
  'ProductDetail',
  'RichText',
  'ImageBand',
  'FAQ',
  'Testimonials',
  'NewsletterSignup',
  'Footer',
  'Nav',
  'CartDrawer',
  'CheckoutShell',
  'LegalText',
  'ContactForm',
  'CollectionFilter',
  'TrustBadges',
] as const;

export type AllowlistedBlockType = (typeof ALLOWLISTED_BLOCK_TYPES)[number];

export const ALLOWLISTED_BLOCK_TYPE_SET = new Set<string>(ALLOWLISTED_BLOCK_TYPES);
