import type { AdminDataPort } from '../../../../modules/admin-command-bar/application/ports/AdminDataPort';
import { classifyBrainAction } from '../../personal-brain/tools/ActionRiskClassifier';
import type { BrainToolExecutor } from '../../personal-brain/tools/types';

export interface CatalogToolsDeps {
  adminData: AdminDataPort;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function listProductsTool(deps: CatalogToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'listProducts',
      description: 'List active products in the catalog with price and stock',
      parameters: {
        limit: { type: 'number', required: false, description: 'Max products (default 50)' },
      },
      risk: 'low',
      kind: 'read',
      module: 'product-catalog',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const limit = Math.min(Number(input.limit ?? 50), 200);
      const products = await deps.adminData.listProductsForBrain(ctx.tenantId, limit);
      return {
        success: true,
        count: products.length,
        products,
      };
    },
  };
}

export function searchCatalogProductsTool(deps: CatalogToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'searchCatalogProducts',
      description: 'Search products by name in the catalog',
      parameters: {
        query: { type: 'string', required: true, description: 'Search query' },
        limit: { type: 'number', required: false, description: 'Max results (default 10)' },
      },
      risk: 'low',
      kind: 'read',
      module: 'product-catalog',
    },
    validate(input) {
      if (!String(input.query ?? '').trim()) {
        return { ok: false, error: 'query is required' };
      }
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const query = String(input.query ?? '').trim();
      const limit = Math.min(Number(input.limit ?? 10), 50);
      const products = await deps.adminData.searchProductsByName(ctx.tenantId, query, limit);
      return {
        success: true,
        query,
        count: products.length,
        products,
      };
    },
  };
}

export function proposeCreateProductTool(deps: CatalogToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'proposeCreateProduct',
      description: 'Propose creating a new product in the catalog',
      parameters: {
        name: { type: 'string', required: true, description: 'Product name' },
        slug: { type: 'string', required: false, description: 'URL slug (auto-generated from name if omitted)' },
        description: { type: 'string', required: false, description: 'Product description' },
        price: { type: 'number', required: false, description: 'Initial price (default 0)' },
        stock: { type: 'number', required: false, description: 'Initial stock (default 0)' },
      },
      risk: 'medium',
      kind: 'propose',
      module: 'product-catalog',
    },
    validate(input) {
      if (!String(input.name ?? '').trim()) {
        return { ok: false, error: 'name is required' };
      }
      return { ok: true };
    },
    async executeRead() {
      return { error: 'proposeCreateProduct is propose-only' };
    },
    async buildProposal(_ctx, input) {
      const name = String(input.name ?? '').trim();
      const slug = String(input.slug ?? slugify(name)).trim() || slugify(name);
      const description = input.description ? String(input.description) : undefined;
      const price = input.price !== undefined ? Number(input.price) : 0;
      const stock = input.stock !== undefined ? Number(input.stock) : 0;
      const assessment = classifyBrainAction('proposeCreateProduct', input);
      return {
        tool: 'proposeCreateProduct',
        summary: `Nieuw product aanmaken: ${name}`,
        risk: assessment.risk,
        requiresApproval: assessment.requiresInbox,
        expectedImpact: assessment.expectedImpact,
        confidence: assessment.confidence,
        rationale: assessment.rationale,
        payload: { name, slug, description, price, stock },
      };
    },
    async executeConfirmed(ctx, payload) {
      const created = await deps.adminData.createProduct(ctx.tenantId, {
        name: String(payload.name),
        slug: String(payload.slug),
        description: payload.description ? String(payload.description) : undefined,
        price: Number(payload.price ?? 0),
        stock: Number(payload.stock ?? 0),
      });
      return {
        success: true,
        result: `Created product ${created.name} (${created.id}, slug: ${created.slug})`,
      };
    },
  };
}
