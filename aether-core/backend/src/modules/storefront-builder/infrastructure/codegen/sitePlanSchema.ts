import { z } from 'zod';
import { ALLOWLISTED_BLOCK_TYPES, ALLOWLISTED_BLOCK_TYPE_SET } from './allowlistedBlocks';
import { CodegenRejectedError } from './CodegenRejectedError';

/** Max nesting depth for PageTree (root Page = depth 0). DoS guard for agent fuzz. */
export const MAX_PAGE_TREE_DEPTH = 12;

const jsonPrimitive = z.union([z.string(), z.number(), z.boolean(), z.null()]);

/** Plain JSON values only — no functions / class instances. */
export const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([jsonPrimitive, z.array(jsonValueSchema), z.record(jsonValueSchema)])
);

const blockTypeSchema = z.string().superRefine((type, ctx) => {
  if (!ALLOWLISTED_BLOCK_TYPE_SET.has(type)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Unknown or disallowed block type: ${type}`,
    });
  }
});

export type PageTreeNode = {
  type: string;
  props?: Record<string, unknown>;
  children?: PageTreeNode[];
};

/**
 * Recursive page tree. Root must be `Page`; descendants must be allowlisted blocks.
 */
export const pageTreeNodeSchema: z.ZodType<PageTreeNode> = z.lazy(() =>
  z
    .object({
      type: z.string().min(1),
      props: z.record(jsonValueSchema).optional(),
      children: z.array(pageTreeNodeSchema).optional(),
    })
    .strict()
);

export const pageTreeRootSchema = pageTreeNodeSchema.superRefine((node, ctx) => {
  if (node.type !== 'Page') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Page tree root must be type "Page", got "${node.type}"`,
      path: ['type'],
    });
  }
  validateDescendants(node.children ?? [], ctx, ['children'], 1);
});

function validateDescendants(
  nodes: PageTreeNode[],
  ctx: z.RefinementCtx,
  path: (string | number)[],
  depth: number
): void {
  if (depth > MAX_PAGE_TREE_DEPTH) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Page tree exceeds max depth ${MAX_PAGE_TREE_DEPTH}`,
      path,
    });
    return;
  }
  nodes.forEach((node, index) => {
    const nodePath = [...path, index];
    if (node.type === 'Page') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nested "Page" nodes are not allowed',
        path: [...nodePath, 'type'],
      });
    } else if (!ALLOWLISTED_BLOCK_TYPE_SET.has(node.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unknown or disallowed block type: ${node.type}`,
        path: [...nodePath, 'type'],
      });
    }
    if (node.children?.length) {
      validateDescendants(node.children, ctx, [...nodePath, 'children'], depth + 1);
    }
  });
}

export const designTokensSchema = z
  .object({
    colors: z
      .object({
        primary: z.string().optional(),
        accent: z.string().optional(),
        background: z.string().optional(),
        foreground: z.string().optional(),
        muted: z.string().optional(),
      })
      .passthrough()
      .optional(),
    typography: z
      .object({
        fontFamily: z.string().optional(),
        fontSizeBase: z.string().optional(),
        scale: z.record(z.string()).optional(),
      })
      .passthrough()
      .optional(),
    spacing: z.record(z.union([z.string(), z.number()])).optional(),
    radius: z.union([z.string(), z.number()]).optional(),
    /** Flat token shorthand used by public storefront resolve (primary/accent/…). */
    primary: z.string().optional(),
    accent: z.string().optional(),
    background: z.string().optional(),
    foreground: z.string().optional(),
    muted: z.string().optional(),
    /** Appendix H token aliases (color/font) — accepted, emitted on compile. */
    color: z
      .object({
        primary: z.string().optional(),
        accent: z.string().optional(),
        bg: z.string().optional(),
        text: z.string().optional(),
      })
      .passthrough()
      .optional(),
    font: z
      .object({
        display: z.string().optional(),
        body: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const sitePlanPageSchema = z
  .object({
    path: z
      .string()
      .min(1)
      .regex(/^\//, 'path must start with /')
      .refine(
        (p) =>
          !p.includes('..') &&
          !p.includes('//') &&
          !p.includes('\\') &&
          !p.includes('\0'),
        { message: 'path must not contain traversal or ambiguous segments' }
      ),
    title: z.string().min(1),
    seo: z.record(jsonValueSchema).optional(),
    sortOrder: z.number().int().optional(),
    tree: pageTreeRootSchema,
  })
  .strict();

/**
 * SitePlan — contract for DesignAgent / StoreBuilderAgent (P06).
 * See aether-core/docs/storefront-site-plan-schema.md
 */
export const sitePlanSchema = z
  .object({
    version: z.literal(1).default(1),
    localeDefault: z.string().min(2).default('nl-NL'),
    locales: z.array(z.string().min(2)).optional(),
    tokens: designTokensSchema.optional(),
    copy: z.record(z.record(jsonValueSchema)).optional(),
    pages: z.array(sitePlanPageSchema).min(1),
    /**
     * v1: overrides are refused. Presence of a non-empty overrides object → CODEGEN_REJECTED.
     */
    overrides: z.record(z.unknown()).optional(),
  })
  .strict()
  .superRefine((plan, ctx) => {
    if (plan.overrides && Object.keys(plan.overrides).length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'overrides/*.tsx are not supported in v1 — remove overrides from SitePlan (AST allowlist lands later)',
        path: ['overrides'],
      });
    }
  });

export type SitePlan = z.infer<typeof sitePlanSchema>;
export type DesignTokens = z.infer<typeof designTokensSchema>;

export function parseSitePlanOrThrow(planJson: unknown): SitePlan {
  const result = sitePlanSchema.safeParse(planJson);
  if (!result.success) {
    throw new CodegenRejectedError('SitePlan validation failed', {
      issues: result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
      allowlistedBlocks: [...ALLOWLISTED_BLOCK_TYPES],
    });
  }
  return result.data;
}

/** Validate a single page tree root (exported for focused unit tests). */
export function parsePageTreeOrThrow(treeJson: unknown): PageTreeNode {
  const result = pageTreeRootSchema.safeParse(treeJson);
  if (!result.success) {
    throw new CodegenRejectedError('Page tree validation failed', {
      issues: result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
      allowlistedBlocks: [...ALLOWLISTED_BLOCK_TYPES],
    });
  }
  // Re-run descendant allowlist via blockTypeSchema for clearer unknown-type errors
  assertTreeAllowlisted(result.data);
  return result.data;
}

function assertTreeAllowlisted(node: PageTreeNode, path = 'tree', depth = 0): void {
  if (depth > MAX_PAGE_TREE_DEPTH) {
    throw new CodegenRejectedError(`Page tree exceeds max depth ${MAX_PAGE_TREE_DEPTH}`, {
      path,
      maxDepth: MAX_PAGE_TREE_DEPTH,
    });
  }
  if (node.type !== 'Page') {
    const check = blockTypeSchema.safeParse(node.type);
    if (!check.success) {
      throw new CodegenRejectedError(`Unknown or disallowed block type: ${node.type}`, {
        path,
        allowlistedBlocks: [...ALLOWLISTED_BLOCK_TYPES],
      });
    }
  }
  for (let i = 0; i < (node.children?.length ?? 0); i++) {
    const child = node.children![i];
    if (child.type === 'Page') {
      throw new CodegenRejectedError('Nested "Page" nodes are not allowed', {
        path: `${path}.children[${i}]`,
      });
    }
    assertTreeAllowlisted(child, `${path}.children[${i}]`, depth + 1);
  }
}
