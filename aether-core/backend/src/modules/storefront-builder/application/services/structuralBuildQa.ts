/**
 * Shared structural build QA — used by StartBuildUseCase and StoreQA `runBuildChecks`.
 * Deterministic, no LLM. Happy-path score ≥ 0.80 (Appendix G publish threshold).
 * CWV / Lighthouse is NOT measured here — see docs/storefront-lighthouse.md.
 */

export interface StructuralBuildCheck {
  id: string;
  ok: boolean;
  detail: string;
}

export interface StructuralBuildQaResult {
  passed: boolean;
  score: number;
  checks: StructuralBuildCheck[];
  blockTypes: string[];
}

export interface StructuralBuildQaInput {
  planJson: unknown;
  artifactsPath: string | null | undefined;
}

function collectBlockTypes(node: unknown, out = new Set<string>()): Set<string> {
  if (!node || typeof node !== 'object') return out;
  const n = node as { type?: unknown; children?: unknown[] };
  if (typeof n.type === 'string') out.add(n.type);
  if (Array.isArray(n.children)) {
    for (const child of n.children) collectBlockTypes(child, out);
  }
  return out;
}

export function pagesFromPlanJson(
  planJson: unknown
): Array<{ path?: string; tree?: unknown }> {
  if (!planJson || typeof planJson !== 'object') return [];
  const pages = (planJson as { pages?: unknown }).pages;
  return Array.isArray(pages) ? (pages as Array<{ path?: string; tree?: unknown }>) : [];
}

/** Structural checks shared with StoreQAAgent tool `runBuildChecks`. */
export function runStructuralBuildChecks(
  input: StructuralBuildQaInput
): StructuralBuildQaResult {
  const pages = pagesFromPlanJson(input.planJson);
  const checks: StructuralBuildCheck[] = [
    {
      id: 'has_pages',
      ok: pages.length > 0,
      detail: pages.length > 0 ? `${pages.length} page(s)` : 'No pages in plan',
    },
    {
      id: 'has_artifacts',
      ok: Boolean(input.artifactsPath),
      detail: input.artifactsPath ? String(input.artifactsPath) : 'No artifactsPath',
    },
    {
      id: 'home_page',
      ok: pages.some((p) => p.path === '/'),
      detail: pages.some((p) => p.path === '/') ? 'Home / present' : 'Missing home path /',
    },
  ];

  const blockTypes = new Set<string>();
  for (const page of pages) collectBlockTypes(page.tree, blockTypes);

  const passed = checks.every((c) => c.ok);
  return {
    passed,
    score: passed ? 0.9 : 0.4,
    checks,
    blockTypes: [...blockTypes],
  };
}

/** Persistable qaReportJson — structural only; no fake CWV numbers. */
export function toStructuralQaReportJson(
  result: StructuralBuildQaResult
): Record<string, unknown> {
  return {
    status: result.passed ? 'passed' : 'failed',
    score: result.score,
    checks: result.checks,
    blockTypes: result.blockTypes,
    note: 'Structural checks only; CWV not measured in Birth (see storefront-lighthouse.md)',
  };
}
