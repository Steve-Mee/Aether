/**
 * Wave 17: compare Express router registrations to OpenAPI path+method sets.
 * Fail if either side has operations the other lacks.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import SwaggerParser from '@apidevtools/swagger-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');
const openapiDir = path.join(backendRoot, 'openapi');
const srcRoot = path.join(backendRoot, 'src');

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);

/** @type {{ name: string, spec: string, sources: string[], mountBySource?: Record<string, string> }[]} */
export const DRIFT_TARGETS = [
  {
    name: 'storefront',
    spec: 'storefront.yaml',
    sources: ['modules/storefront-builder/api/storefrontRouter.ts'],
  },
  {
    name: 'website',
    spec: 'website.yaml',
    sources: [
      'modules/storefront-builder/api/websiteProjectsRoutes.ts',
      'modules/storefront-builder/api/websiteRevisionsRoutes.ts',
      'modules/storefront-builder/api/websitePagesRoutes.ts',
      'modules/storefront-builder/api/websiteBuildsPreviewRoutes.ts',
    ],
  },
];

export const COMMERCE_DRIFT_TARGET = {
  name: 'commerce',
  spec: 'commerce.yaml',
  sources: [
    'modules/product-catalog/index.ts',
    'modules/order-management/index.ts',
    'modules/customers/index.ts',
    'modules/promotions/index.ts',
    'modules/inventory-pricing/index.ts',
    'modules/payment-fulfillment/index.ts',
  ],
  mountBySource: {
    'modules/product-catalog/index.ts': '/products',
    'modules/order-management/index.ts': '/orders',
    'modules/customers/index.ts': '/customers',
    'modules/promotions/index.ts': '/promotions',
    'modules/inventory-pricing/index.ts': '/inventory',
    'modules/payment-fulfillment/index.ts': '/payments',
  },
};

export const ADMIN_DRIFT_TARGET = {
  name: 'admin',
  spec: 'admin.yaml',
  sources: [
    'modules/admin-command-bar/index.ts',
    'modules/bilateral-exchange/adminRouter.ts',
  ],
  mountBySource: {
    'modules/admin-command-bar/index.ts': '',
    'modules/bilateral-exchange/adminRouter.ts': '/bilateral',
  },
};

/** Always-on platform mounts; feature-gated experimental APIs are excluded by omission. */
export const PLATFORM_DRIFT_TARGET = {
  name: 'platform',
  spec: 'platform.yaml',
  sources: [
    'modules/merchant-auth/index.ts',
    'modules/product-catalog/mediaRouter.ts',
    'modules/aether-mail/index.ts',
    'modules/supplier-intelligence/index.ts',
    'modules/approvals/index.ts',
    'modules/outcomes/index.ts',
    'modules/autonomous-operations/index.ts',
    'modules/plugin-system/index.ts',
    'modules/zero-knowledge-hive-mind/index.ts',
    'modules/bilateral-exchange/index.ts',
  ],
  mountBySource: {
    'modules/merchant-auth/index.ts': '/auth',
    'modules/product-catalog/mediaRouter.ts': '/media',
    'modules/aether-mail/index.ts': '/emails',
    'modules/supplier-intelligence/index.ts': '/suppliers',
    'modules/approvals/index.ts': '/approvals',
    'modules/outcomes/index.ts': '/outcomes',
    'modules/autonomous-operations/index.ts': '/autonomous',
    'modules/plugin-system/index.ts': '/plugins',
    'modules/zero-knowledge-hive-mind/index.ts': '/hive-mind',
    'modules/bilateral-exchange/index.ts': '/bilateral',
  },
};

/** Feature-gated mounts excluded from OpenAPI drift (accepted residual). */
export const EXPERIMENTAL_OPENAPI_EXCLUSIONS = [
  '/api/predictive',
  '/api/self-evolving',
  '/api/agentic',
  '/api/physical',
  '/api/co-ownership',
];

const ROUTE_RE =
  /\b(?:router|app|[A-Za-z]\w*Router)\.(get|post|put|patch|delete|options|head)\(\s*['`]([^'`]+)['`]/g;

function normalizePath(p) {
  let out = p.trim();
  if (!out.startsWith('/')) out = `/${out}`;
  out = out.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, '{$1}');
  if (out.length > 1 && out.endsWith('/')) out = out.slice(0, -1);
  return out;
}

function joinMount(mount, routePath) {
  const base = mount.replace(/\/$/, '');
  const rel = routePath === '/' ? '' : normalizePath(routePath);
  if (!rel) return base || '/';
  return normalizePath(`${base}${rel}`);
}

function extractExpressOps(fileRel, mountPrefix = '') {
  const abs = path.join(srcRoot, fileRel);
  const text = fs.readFileSync(abs, 'utf8');
  const ops = new Set();
  let m;
  ROUTE_RE.lastIndex = 0;
  while ((m = ROUTE_RE.exec(text)) !== null) {
    const method = m[1].toLowerCase();
    const rawPath = m[2];
    const full = mountPrefix ? joinMount(mountPrefix, rawPath) : normalizePath(rawPath);
    ops.add(`${method} ${full}`);
  }
  return ops;
}

function extractOpenApiOps(api) {
  const ops = new Set();
  for (const [p, item] of Object.entries(api.paths ?? {})) {
    if (!item || typeof item !== 'object') continue;
    for (const method of Object.keys(item)) {
      if (!HTTP_METHODS.has(method.toLowerCase())) continue;
      ops.add(`${method.toLowerCase()} ${normalizePath(p)}`);
    }
  }
  return ops;
}

function diffSets(a, b) {
  return [...a].filter((x) => !b.has(x)).sort();
}

export async function checkDrift(targets = DRIFT_TARGETS) {
  let failed = false;
  for (const target of targets) {
    const specPath = path.join(openapiDir, target.spec);
    if (!fs.existsSync(specPath)) {
      console.error(`DRIFT SKIP ${target.name}: missing ${target.spec}`);
      failed = true;
      continue;
    }
    const api = await SwaggerParser.validate(specPath);
    const openapiOps = extractOpenApiOps(api);

    const expressOps = new Set();
    for (const src of target.sources) {
      const mount = target.mountBySource?.[src] ?? '';
      for (const op of extractExpressOps(src, mount)) {
        expressOps.add(op);
      }
    }

    const missingInSpec = diffSets(expressOps, openapiOps);
    const missingInRouter = diffSets(openapiOps, expressOps);

    if (missingInSpec.length === 0 && missingInRouter.length === 0) {
      console.log(`DRIFT OK  ${target.name} (${expressOps.size} ops)`);
      continue;
    }
    failed = true;
    console.error(`DRIFT FAIL ${target.name}`);
    if (missingInSpec.length) {
      console.error('  in Express, missing from OpenAPI:');
      for (const op of missingInSpec) console.error(`    + ${op}`);
    }
    if (missingInRouter.length) {
      console.error('  in OpenAPI, missing from Express:');
      for (const op of missingInRouter) console.error(`    - ${op}`);
    }
  }
  return !failed;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  checkDrift().then((ok) => process.exit(ok ? 0 : 1));
}
