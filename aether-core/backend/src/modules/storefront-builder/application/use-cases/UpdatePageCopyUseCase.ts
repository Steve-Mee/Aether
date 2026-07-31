import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { SiteRepository, CreateRevisionResult } from '../../domain/repositories/SiteRepository';
import { CreateRevisionUseCase } from './CreateRevisionUseCase';

export class PageNotFoundForCopyError extends Error {
  constructor(pageId: string) {
    super(`Site page not found: ${pageId}`);
    this.name = 'PageNotFoundForCopyError';
  }
}

export interface PageCopyPatch {
  headline?: string;
  subheadline?: string;
}

type TreeNode = {
  type?: string;
  props?: Record<string, unknown>;
  children?: TreeNode[];
  [key: string]: unknown;
};

function applyHeroCopy(node: TreeNode, patch: PageCopyPatch): TreeNode {
  const next: TreeNode = {
    ...node,
    props: node.props ? { ...node.props } : undefined,
    children: node.children?.map((c) => applyHeroCopy(c, patch)),
  };
  if (next.type === 'Hero' && next.props) {
    if (typeof patch.headline === 'string') next.props.headline = patch.headline;
    if (typeof patch.subheadline === 'string') next.props.subheadline = patch.subheadline;
  }
  return next;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Minimal CMS content edit: allowlisted Hero headline/subheadline → new revision (audit trail).
 * Never publishes.
 */
export class UpdatePageCopyUseCase {
  constructor(
    private readonly siteRepository: SiteRepository,
    private readonly createRevision: CreateRevisionUseCase
  ) {}

  async execute(
    tenantId: string,
    pageId: string,
    patch: PageCopyPatch
  ): Promise<CreateRevisionResult & { pagePath: string }> {
    const tid = requireTenantId(tenantId, 'UpdatePageCopyUseCase.execute');
    if (
      (patch.headline === undefined || patch.headline === '') &&
      (patch.subheadline === undefined || patch.subheadline === '')
    ) {
      throw new Error('At least one of headline or subheadline is required');
    }

    const page = await this.siteRepository.findPageById(tid, pageId);
    if (!page) throw new PageNotFoundForCopyError(pageId);

    const revision = await this.siteRepository.findRevisionById(tid, page.revisionId);
    if (!revision) throw new PageNotFoundForCopyError(pageId);

    const tree = applyHeroCopy(cloneJson(page.treeJson as TreeNode), patch);
    const plan = cloneJson(revision.planJson) as {
      pages?: Array<{ path?: string; tree?: TreeNode; [key: string]: unknown }>;
      [key: string]: unknown;
    };
    if (Array.isArray(plan.pages)) {
      plan.pages = plan.pages.map((p) => {
        if (p.path === page.path && p.tree) {
          return { ...p, tree: applyHeroCopy(cloneJson(p.tree), patch) };
        }
        return p;
      });
    }

    // Ensure plan page tree matches patched page tree even if plan lacked the page entry.
    if (Array.isArray(plan.pages)) {
      const idx = plan.pages.findIndex((p) => p.path === page.path);
      if (idx >= 0) {
        plan.pages[idx] = { ...plan.pages[idx], tree };
      }
    }

    const result = await this.createRevision.execute(tid, revision.projectId, {
      parentRevisionId: revision.id,
      brief: revision.briefJson,
      plan,
      createdByAgent: 'merchant_page_copy_edit',
    });

    return { ...result, pagePath: page.path };
  }
}
