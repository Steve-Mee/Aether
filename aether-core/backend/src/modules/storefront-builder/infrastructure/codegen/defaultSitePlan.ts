import {
  appendixHTokensToDesignTokens,
  expandToCompilableSitePlan,
} from './appendixHFixtures';
import type { SitePlan } from './sitePlanSchema';
import { parseSitePlanOrThrow } from './sitePlanSchema';

/**
 * Deterministic fallback SitePlan when agents have not yet supplied pages.
 * Expands to Appendix H–compatible trees (normative for P06).
 */
export function synthesizeDefaultSitePlan(briefJson: unknown): SitePlan {
  return parseSitePlanOrThrow(expandToCompilableSitePlan(briefJson, {}));
}

/** Token helper for brief → design tokens (Appendix H palette). */
export function defaultTokensFromBrief(briefJson: unknown) {
  const brand =
    briefJson && typeof briefJson === 'object'
      ? (briefJson as { brand?: { primaryColor?: string; accentColor?: string } }).brand
      : undefined;
  return appendixHTokensToDesignTokens(
    typeof brand?.primaryColor === 'string' ? brand.primaryColor : undefined,
    typeof brand?.accentColor === 'string' ? brand.accentColor : undefined
  );
}

/**
 * Path → artifact filename stem.
 * `/` → index; `/products/:slug` → products.[slug] (architecture §3.3).
 */
export function pathToTreeFileName(pagePath: string): string {
  if (pagePath === '/') return 'index';
  return pagePath
    .replace(/^\//, '')
    .replace(/\//g, '.')
    .replace(/:([A-Za-z0-9_]+)/g, '[$1]');
}
