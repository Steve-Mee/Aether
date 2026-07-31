import {
  APPENDIX_H_COPY_NL,
  APPENDIX_H_PLAN,
  APPENDIX_H_TREES_BY_TEMPLATE,
  APPENDIX_H_TOKENS,
  AppendixHTemplate,
} from './appendixHData';
import { normalizeTokensInput } from './appendixHTokens';

export function brandNameFromBrief(
  briefJson: unknown,
  fallback: string = APPENDIX_H_PLAN.brand.name
): string {
  if (
    briefJson &&
    typeof briefJson === 'object' &&
    briefJson !== null &&
    'brand' in briefJson &&
    typeof (briefJson as { brand?: { name?: unknown } }).brand?.name === 'string'
  ) {
    return String((briefJson as { brand: { name: string } }).brand.name);
  }
  if (
    briefJson &&
    typeof briefJson === 'object' &&
    briefJson !== null &&
    typeof (briefJson as { brandName?: unknown }).brandName === 'string'
  ) {
    return String((briefJson as { brandName: string }).brandName);
  }
  return fallback;
}

function brandColorsFromInput(
  briefJson: unknown,
  planJson: unknown
): { primary: string; accent: string } {
  const fromBrand = (obj: unknown): { primary?: string; accent?: string } => {
    if (!obj || typeof obj !== 'object') return {};
    const brand = (obj as { brand?: Record<string, unknown> }).brand;
    if (!brand || typeof brand !== 'object') return {};
    return {
      primary: typeof brand.primaryColor === 'string' ? brand.primaryColor : undefined,
      accent: typeof brand.accentColor === 'string' ? brand.accentColor : undefined,
    };
  };
  const brief = fromBrand(briefJson);
  const plan = fromBrand(planJson);
  return {
    primary: plan.primary ?? brief.primary ?? APPENDIX_H_TOKENS.color.primary,
    accent: plan.accent ?? brief.accent ?? APPENDIX_H_TOKENS.color.accent,
  };
}

function cloneTreeWithBrandFooter(
  tree: { type: 'Page'; children: ReadonlyArray<{ type: string; props?: Record<string, unknown> }> },
  brandName: string,
  options: { isHome?: boolean } = {}
): { type: string; children: Array<Record<string, unknown>> } {
  const footerText = `© ${brandName}`;
  const defaultBrand = APPENDIX_H_PLAN.brand.name;
  return {
    type: 'Page',
    children: tree.children.map((child) => {
      if (child.type === 'Footer') {
        return { type: 'Footer', props: { text: footerText } };
      }
      if (
        options.isHome &&
        child.type === 'Hero' &&
        brandName !== defaultBrand &&
        child.props
      ) {
        return {
          type: 'Hero',
          props: { ...child.props, headline: brandName },
        };
      }
      return {
        type: child.type,
        ...(child.props !== undefined ? { props: { ...child.props } } : {}),
      };
    }),
  };
}

/**
 * Expand a template key into the normative Appendix H page tree.
 * Footer text uses brandName; all other props stay Appendix H.
 */
export function treeForTemplate(
  template: string,
  brandName: string
): { type: string; children: Array<Record<string, unknown>> } {
  const canonical =
    template in APPENDIX_H_TREES_BY_TEMPLATE
      ? APPENDIX_H_TREES_BY_TEMPLATE[template as AppendixHTemplate]
      : null;
  if (canonical) {
    return cloneTreeWithBrandFooter(canonical, brandName, {
      isHome: template === 'home',
    });
  }
  return {
    type: 'Page',
    children: [
      { type: 'RichText', props: { body: brandName } },
      { type: 'Footer', props: { text: `© ${brandName}` } },
    ],
  };
}

function pageHasTree(page: unknown): boolean {
  return (
    !!page &&
    typeof page === 'object' &&
    (page as { tree?: unknown }).tree != null &&
    typeof (page as { tree: unknown }).tree === 'object'
  );
}

function pagesHaveTrees(planJson: unknown): boolean {
  if (!planJson || typeof planJson !== 'object') return false;
  const pages = (planJson as { pages?: unknown }).pages;
  if (!Array.isArray(pages) || pages.length === 0) return false;
  return pages.every(pageHasTree);
}

/**
 * Expand brief/plan (including Appendix H template-only plans) into a
 * SitePlan-shaped object with embedded allowlisted trees for Zod validation.
 */
export function expandToCompilableSitePlan(
  briefJson: unknown,
  planJson: unknown
): Record<string, unknown> {
  const planBrandName =
    planJson &&
    typeof planJson === 'object' &&
    typeof (planJson as { brand?: { name?: unknown } }).brand?.name === 'string'
      ? String((planJson as { brand: { name: string } }).brand.name)
      : undefined;
  const brandName = brandNameFromBrief(
    briefJson,
    planBrandName ?? (APPENDIX_H_PLAN.brand.name as string)
  );
  const colors = brandColorsFromInput(briefJson, planJson);
  const localeDefault: string =
    (planJson &&
    typeof planJson === 'object' &&
    typeof (planJson as { localeDefault?: unknown }).localeDefault === 'string'
      ? (planJson as { localeDefault: string }).localeDefault
      : undefined) ||
    (briefJson &&
    typeof briefJson === 'object' &&
    typeof (briefJson as { localeDefault?: unknown }).localeDefault === 'string'
      ? (briefJson as { localeDefault: string }).localeDefault
      : undefined) ||
    (APPENDIX_H_PLAN.localeDefault as string);

  const tokensFromPlan =
    planJson && typeof planJson === 'object'
      ? (planJson as { tokens?: unknown }).tokens
      : undefined;

  const tokens = normalizeTokensInput(tokensFromPlan, colors.primary, colors.accent);

  const copyFromPlan =
    planJson && typeof planJson === 'object'
      ? (planJson as { copy?: unknown }).copy
      : undefined;

  const copy =
    copyFromPlan && typeof copyFromPlan === 'object'
      ? copyFromPlan
      : {
          [localeDefault]: {
            ...APPENDIX_H_COPY_NL,
            brandName,
            ...(brandName !== APPENDIX_H_PLAN.brand.name
              ? { 'home.hero.headline': brandName }
              : {}),
          },
        };

  const overrides =
    planJson && typeof planJson === 'object'
      ? (planJson as { overrides?: unknown }).overrides
      : undefined;

  if (pagesHaveTrees(planJson)) {
    const pages = (planJson as { pages: Array<Record<string, unknown>> }).pages.map(
      (page, index) => {
        const { template: _template, ...rest } = page;
        return {
          ...rest,
          sortOrder: typeof page.sortOrder === 'number' ? page.sortOrder : index,
        };
      }
    );
    const result: Record<string, unknown> = {
      version: 1,
      localeDefault,
      locales:
        planJson &&
        typeof planJson === 'object' &&
        Array.isArray((planJson as { locales?: unknown }).locales)
          ? (planJson as { locales: string[] }).locales
          : [localeDefault],
      tokens,
      copy,
      pages,
    };
    if (overrides !== undefined) result.overrides = overrides;
    return result;
  }

  // Appendix H template plan, or empty plan → expand from templates
  const sourcePages: Array<Record<string, unknown>> =
    planJson &&
    typeof planJson === 'object' &&
    Array.isArray((planJson as { pages?: unknown }).pages) &&
    (planJson as { pages: unknown[] }).pages.length > 0
      ? ((planJson as { pages: Array<Record<string, unknown>> }).pages as Array<
          Record<string, unknown>
        >)
      : (APPENDIX_H_PLAN.pages.map((p) => ({ ...p })) as Array<Record<string, unknown>>);

  const pages = sourcePages.map((page, index) => {
    if (pageHasTree(page)) {
      const { template: _t, ...rest } = page;
      return {
        ...rest,
        sortOrder: typeof page.sortOrder === 'number' ? page.sortOrder : index,
      };
    }
    const template =
      typeof page.template === 'string'
        ? page.template
        : page.path === '/'
          ? 'home'
          : 'about';
    const title = typeof page.title === 'string' ? page.title : 'Page';
    const path = typeof page.path === 'string' ? page.path : '/';
    return {
      path,
      title,
      sortOrder: typeof page.sortOrder === 'number' ? page.sortOrder : index,
      seo:
        page.seo && typeof page.seo === 'object'
          ? (page.seo as Record<string, unknown>)
          : {
              title: `${brandName}${path === '/' ? '' : ` — ${title}`}`,
              description: title,
            },
      tree: treeForTemplate(template, brandName),
    };
  });

  const result: Record<string, unknown> = {
    version: 1,
    localeDefault,
    locales:
      planJson &&
      typeof planJson === 'object' &&
      Array.isArray((planJson as { locales?: unknown }).locales)
        ? (planJson as { locales: string[] }).locales
        : [localeDefault],
    tokens,
    copy,
    pages,
  };
  if (overrides !== undefined) result.overrides = overrides;
  return result;
}
