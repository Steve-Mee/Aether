import type { BrainToolExecutor, PersonalBrainToolRegistryDeps } from './types';

export function searchProductsTool(deps: PersonalBrainToolRegistryDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'search_products',
      description: 'Search products by name or keyword',
      parameters: {
        query: { type: 'string', required: true, description: 'Product search query' },
      },
      risk: 'low',
      kind: 'read',
      module: 'admin-command-bar',
    },
    validate(input) {
      if (!String(input.query ?? '').trim()) return { ok: false, error: 'query is required' };
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const hits = await deps.adminData.searchProductsByName(ctx.tenantId, String(input.query), 5);
      return hits.map((p) => ({ id: p.id, name: p.name, price: p.price, stock: p.stock }));
    },
  };
}

export function recallMemoryTool(deps: PersonalBrainToolRegistryDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'recall_memory',
      description: 'Recall relevant merchant memory snippets',
      parameters: {
        query: { type: 'string', required: true, description: 'Memory search query' },
      },
      risk: 'low',
      kind: 'read',
      module: 'personal-brain',
    },
    validate(input) {
      if (!String(input.query ?? '').trim()) return { ok: false, error: 'query is required' };
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const agentKey = ctx.agentKey ?? 'admin';
      const recall = await deps.personalBrains.get(ctx.tenantId, agentKey).recall(String(input.query), 5);
      return { snippets: recall.snippets, count: recall.snippets.length };
    },
  };
}

export function getCollectiveInsightsTool(deps: PersonalBrainToolRegistryDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'get_collective_insights',
      description: 'Fetch anonymized collective insights (KT-gated)',
      parameters: {},
      risk: 'low',
      kind: 'read',
      module: 'global-brain',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx) {
      if (!(await deps.ktGate?.isEnabled(ctx.tenantId)) || !deps.globalBrain) {
        return { insights: [] };
      }
      const insights = await deps.globalBrain.getCollectiveInsights(ctx.tenantId);
      return insights.map((i) => ({ category: i.category, summary: i.summary }));
    },
  };
}

export function getProductInfoTool(deps: PersonalBrainToolRegistryDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'getProductInfo',
      description: 'Get detailed product information by name or id',
      parameters: {
        query: { type: 'string', required: true, description: 'Product name or search term' },
      },
      risk: 'low',
      kind: 'read',
      module: 'admin-command-bar',
    },
    validate(input) {
      if (!String(input.query ?? '').trim()) return { ok: false, error: 'query is required' };
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const hits = await deps.adminData.searchProductsByName(ctx.tenantId, String(input.query), 3);
      return hits.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        stock: p.stock,
        slug: p.slug,
        description: p.description ?? null,
      }));
    },
  };
}

const ALL_APPROVAL_MODULES = [
  'admin-command-bar',
  'aether-mail',
  'supplier-intelligence',
  'payment-fulfillment',
  'self-evolving-codebase',
  'approval',
];

function parseApprovalPayload(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function getPendingApprovalsTool(deps: PersonalBrainToolRegistryDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'getPendingApprovals',
      description: 'List pending approval requests in the merchant inbox',
      parameters: {
        modules: {
          type: 'string',
          required: false,
          description: 'Comma-separated module filter (default: all modules)',
        },
      },
      risk: 'low',
      kind: 'read',
      module: 'approval',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const modulesRaw = String(input.modules ?? '').trim();
      const modules = modulesRaw
        ? modulesRaw.split(',').map((m) => m.trim()).filter(Boolean)
        : ALL_APPROVAL_MODULES;

      const rows = await deps.adminData.listPendingApprovals(ctx.tenantId, modules);
      return rows.map((row) => {
        const extended = row as { id: string; payload: string; module?: string; actionType?: string; createdAt?: Date };
        const payload = parseApprovalPayload(extended.payload);
        return {
          id: extended.id,
          module: extended.module ?? 'unknown',
          actionType: extended.actionType ?? 'unknown',
          summary: typeof payload.summary === 'string' ? payload.summary : undefined,
          risk: typeof payload.risk === 'string' ? payload.risk : undefined,
          createdAt: extended.createdAt?.toISOString?.() ?? undefined,
        };
      });
    },
  };
}
