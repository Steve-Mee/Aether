import {
  parsePageTreeOrThrow,
  parseSitePlanOrThrow,
  type DesignTokens,
  type PageTreeNode,
  type SitePlan,
} from '../../../../modules/storefront-builder/infrastructure/codegen/sitePlanSchema';
import { synthesizeDefaultSitePlan } from '../../../../modules/storefront-builder/infrastructure/codegen/defaultSitePlan';
import type { LlmInferencePort } from '../../../../shared/ai/LlmInferencePort';

function brandNameFromBrief(brief: unknown): string {
  if (brief && typeof brief === 'object' && brief !== null) {
    const brand = (brief as { brand?: { name?: unknown }; brandName?: unknown }).brand;
    if (brand && typeof brand === 'object' && typeof brand.name === 'string') {
      return brand.name;
    }
    const brandName = (brief as { brandName?: unknown }).brandName;
    if (typeof brandName === 'string' && brandName.trim()) return brandName.trim();
  }
  return 'Store';
}

function extractJsonObject(raw: string): unknown | null {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Deterministic SitePlan when LLM is unavailable — always allowlisted.
 * Exported for unit tests (CI-safe Local AI First fallback).
 */
export function buildFallbackSitePlan(brief: unknown): SitePlan {
  return parseSitePlanOrThrow(synthesizeDefaultSitePlan(brief));
}

export function buildFallbackTokens(brief: unknown): DesignTokens {
  return buildFallbackSitePlan(brief).tokens ?? {
    primary: '#1a1a1a',
    accent: '#c4a484',
    background: '#faf9f7',
    foreground: '#1a1a1a',
    muted: '#6b6b6b',
  };
}

export function buildFallbackPageTree(brief: unknown, path = '/'): PageTreeNode {
  const plan = buildFallbackSitePlan(brief);
  const page = plan.pages.find((p) => p.path === path) ?? plan.pages[0];
  return parsePageTreeOrThrow(page.tree);
}

export function buildFallbackCopy(brief: unknown): Record<string, Record<string, unknown>> {
  const plan = buildFallbackSitePlan(brief);
  return (plan.copy as Record<string, Record<string, unknown>>) ?? {
    'nl-NL': {
      brandName: brandNameFromBrief(brief),
      homeHeadline: brandNameFromBrief(brief),
      shopCta: 'Shop',
    },
  };
}

export function buildFallbackMeta(brief: unknown): Record<string, unknown> {
  const brand = brandNameFromBrief(brief);
  return {
    title: brand,
    description: `Welcome to ${brand}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: brand,
    },
  };
}

export async function llmJsonOrFallback<T>(
  llm: LlmInferencePort | undefined,
  prompt: string,
  fallback: () => T,
  validate: (value: unknown) => T
): Promise<{ value: T; source: 'llm' | 'fallback' }> {
  if (!llm) {
    return { value: fallback(), source: 'fallback' };
  }
  try {
    const raw = await llm.generate({ prompt, temperature: 0.2 });
    const parsed = extractJsonObject(raw);
    if (parsed == null) {
      return { value: fallback(), source: 'fallback' };
    }
    return { value: validate(parsed), source: 'llm' };
  } catch {
    return { value: fallback(), source: 'fallback' };
  }
}

export { brandNameFromBrief };
