import {
  parsePageTreeOrThrow,
  parseSitePlanOrThrow,
} from '../../../../modules/storefront-builder/infrastructure/codegen/sitePlanSchema';
import type { LlmInferencePort } from '../../../../shared/ai/LlmInferencePort';
import type { BrainToolExecutor } from '../../personal-brain/tools/types';
import {
  brandNameFromBrief,
  buildFallbackPageTree,
  buildFallbackSitePlan,
  buildFallbackTokens,
  llmJsonOrFallback,
} from './storefrontPlanFallback';

export interface DesignToolsDeps {
  llm?: LlmInferencePort;
}

export function proposeLayoutTool(deps: DesignToolsDeps = {}): BrainToolExecutor {
  return {
    definition: {
      name: 'proposeLayout',
      description:
        'Propose a storefront page layout (allowlisted block tree). Uses local LLM with deterministic fallback.',
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
        `Propose a storefront page tree JSON for path ${path}. Root type must be Page. ` +
          `Only allowlisted blocks: Hero, ProductGrid, RichText, Nav, Footer, FAQ, Testimonials, TrustBadges, ImageBand, LogoBar, NewsletterSignup, ContactForm, CollectionFilter, LegalText, CartDrawer, CheckoutShell, ProductDetail. ` +
          `Brief: ${JSON.stringify(brief)}. Reply with JSON only: { "tree": { "type":"Page", "children":[...] } }`,
        () => ({ tree: buildFallbackPageTree(brief, path) }),
        (value) => {
          const tree = (value as { tree?: unknown }).tree ?? value;
          return { tree: parsePageTreeOrThrow(tree) };
        }
      );
      return {
        success: true,
        path,
        source: result.source,
        tree: result.value.tree,
        brandName: brandNameFromBrief(brief),
      };
    },
  };
}

export function proposeTokensTool(deps: DesignToolsDeps = {}): BrainToolExecutor {
  return {
    definition: {
      name: 'proposeTokens',
      description: 'Propose design tokens (colors, typography) for a storefront SitePlan',
      parameters: {
        brief: { type: 'object', required: false, description: 'Store brief / brand context' },
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
      const result = await llmJsonOrFallback(
        deps.llm,
        `Propose design tokens JSON for this brand brief: ${JSON.stringify(brief)}. ` +
          `Reply with JSON only: { "tokens": { "primary":"#hex", "accent":"#hex", "background":"#hex", "foreground":"#hex", "muted":"#hex", "colors": {...} } }`,
        () => ({ tokens: buildFallbackTokens(brief) }),
        (value) => {
          const tokens = (value as { tokens?: unknown }).tokens ?? value;
          if (!tokens || typeof tokens !== 'object') {
            return { tokens: buildFallbackTokens(brief) };
          }
          return { tokens: tokens as ReturnType<typeof buildFallbackTokens> };
        }
      );
      return {
        success: true,
        source: result.source,
        tokens: result.value.tokens,
      };
    },
  };
}

export function proposePageTreeTool(deps: DesignToolsDeps = {}): BrainToolExecutor {
  return {
    definition: {
      name: 'proposePageTree',
      description: 'Propose a full multi-page SitePlan tree (allowlisted blocks only)',
      parameters: {
        brief: { type: 'object', required: false, description: 'Store brief / brand context' },
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
      let source: 'llm' | 'fallback' = 'fallback';
      let plan = buildFallbackSitePlan(brief);

      if (deps.llm) {
        try {
          const raw = await deps.llm.generate({
            prompt:
              `Propose a SitePlan JSON (version 1) with pages[], tokens, copy. ` +
              `Only allowlisted block types. Brief: ${JSON.stringify(brief)}. JSON only.`,
            temperature: 0.2,
          });
          const match = raw.match(/\{[\s\S]*\}/);
          if (match) {
            plan = parseSitePlanOrThrow(JSON.parse(match[0]));
            source = 'llm';
          }
        } catch {
          plan = buildFallbackSitePlan(brief);
          source = 'fallback';
        }
      }

      return {
        success: true,
        source,
        plan,
        pageCount: plan.pages.length,
      };
    },
  };
}
