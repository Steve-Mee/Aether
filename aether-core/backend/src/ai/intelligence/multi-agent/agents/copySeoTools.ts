import type { LlmInferencePort } from '../../../../shared/ai/LlmInferencePort';
import type { BrainToolExecutor } from '../../personal-brain/tools/types';
import {
  brandNameFromBrief,
  buildFallbackCopy,
  buildFallbackMeta,
  llmJsonOrFallback,
} from './storefrontPlanFallback';

export interface CopySeoToolsDeps {
  llm?: LlmInferencePort;
}

export function proposeCopyTool(deps: CopySeoToolsDeps = {}): BrainToolExecutor {
  return {
    definition: {
      name: 'proposeCopy',
      description: 'Propose storefront microcopy / PDP text keyed by locale',
      parameters: {
        brief: { type: 'object', required: false, description: 'Store brief / brand context' },
        locale: { type: 'string', required: false, description: 'Locale code (default nl-NL)' },
      },
      risk: 'medium',
      kind: 'read',
      module: 'storefront-builder',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(_ctx, input) {
      const brief = input.brief ?? {};
      const locale = String(input.locale ?? 'nl-NL');
      const result = await llmJsonOrFallback(
        deps.llm,
        `Propose storefront copy JSON for locale ${locale}. Brief: ${JSON.stringify(brief)}. ` +
          `Reply with JSON only: { "copy": { "${locale}": { "brandName":"...", "homeHeadline":"...", "shopCta":"..." } } }`,
        () => ({ copy: buildFallbackCopy(brief) }),
        (value) => {
          const copy = (value as { copy?: unknown }).copy ?? value;
          if (!copy || typeof copy !== 'object') {
            return { copy: buildFallbackCopy(brief) };
          }
          return { copy: copy as Record<string, Record<string, unknown>> };
        }
      );
      return {
        success: true,
        source: result.source,
        locale,
        copy: result.value.copy,
        brandName: brandNameFromBrief(brief),
      };
    },
  };
}

export function proposeMetaTool(deps: CopySeoToolsDeps = {}): BrainToolExecutor {
  return {
    definition: {
      name: 'proposeMeta',
      description: 'Propose SEO meta titles, descriptions, and JSON-LD for storefront pages',
      parameters: {
        brief: { type: 'object', required: false, description: 'Store brief / brand context' },
        path: { type: 'string', required: false, description: 'Page path (default /)' },
      },
      risk: 'medium',
      kind: 'read',
      module: 'storefront-builder',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(_ctx, input) {
      const brief = input.brief ?? {};
      const path = String(input.path ?? '/');
      const result = await llmJsonOrFallback(
        deps.llm,
        `Propose SEO meta JSON for path ${path}. Brief: ${JSON.stringify(brief)}. ` +
          `Reply with JSON only: { "meta": { "title":"...", "description":"...", "jsonLd": {...} } }`,
        () => ({ meta: buildFallbackMeta(brief) }),
        (value) => {
          const meta = (value as { meta?: unknown }).meta ?? value;
          if (!meta || typeof meta !== 'object') {
            return { meta: buildFallbackMeta(brief) };
          }
          return { meta: meta as Record<string, unknown> };
        }
      );
      return {
        success: true,
        source: result.source,
        path,
        meta: result.value.meta,
      };
    },
  };
}

export function localizeTool(deps: CopySeoToolsDeps = {}): BrainToolExecutor {
  return {
    definition: {
      name: 'localize',
      description: 'Localize storefront copy into a target locale (deterministic fallback when LLM unavailable)',
      parameters: {
        copy: { type: 'object', required: false, description: 'Source copy map' },
        brief: { type: 'object', required: false, description: 'Store brief for fallback' },
        sourceLocale: { type: 'string', required: false, description: 'Source locale (default nl-NL)' },
        targetLocale: { type: 'string', required: true, description: 'Target locale e.g. en-US' },
      },
      risk: 'medium',
      kind: 'read',
      module: 'storefront-builder',
    },
    validate(input) {
      if (!String(input.targetLocale ?? '').trim()) {
        return { ok: false, error: 'targetLocale is required' };
      }
      return { ok: true };
    },
    async executeRead(_ctx, input) {
      const targetLocale = String(input.targetLocale).trim();
      const sourceLocale = String(input.sourceLocale ?? 'nl-NL');
      const brief = input.brief ?? {};
      const sourceCopy =
        (input.copy as Record<string, Record<string, unknown>> | undefined) ??
        buildFallbackCopy(brief);
      const source = sourceCopy[sourceLocale] ?? Object.values(sourceCopy)[0] ?? {
        brandName: brandNameFromBrief(brief),
        homeHeadline: brandNameFromBrief(brief),
        shopCta: 'Shop',
      };

      const result = await llmJsonOrFallback(
        deps.llm,
        `Translate this storefront copy from ${sourceLocale} to ${targetLocale}. ` +
          `Source: ${JSON.stringify(source)}. Reply with JSON only: { "localized": { ...same keys... } }`,
        () => ({
          localized: {
            ...source,
            shopCta: targetLocale.startsWith('en') ? 'Shop now' : String(source.shopCta ?? 'Shop'),
            _locale: targetLocale,
            _note: 'fallback-untranslated',
          },
        }),
        (value) => {
          const localized = (value as { localized?: unknown }).localized ?? value;
          if (!localized || typeof localized !== 'object') {
            return {
              localized: { ...source, _locale: targetLocale, _note: 'fallback-untranslated' },
            };
          }
          return { localized: localized as Record<string, unknown> };
        }
      );

      return {
        success: true,
        source: result.source,
        sourceLocale,
        targetLocale,
        localized: result.value.localized,
        copy: { ...sourceCopy, [targetLocale]: result.value.localized },
      };
    },
  };
}
