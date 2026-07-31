/**
 * One-shot / maintainable generator for openapi/commerce.yaml from Express routes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMMERCE_DRIFT_TARGET } from './openapi-route-drift.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(backendRoot, 'src');

const ROUTE_RE =
  /\b(?:router|app)\.(get|post|put|patch|delete|options|head)\(\s*['`]([^'`]+)['`]/g;

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

function tagForPath(p) {
  const seg = p.split('/').filter(Boolean)[0];
  const map = {
    products: 'Products',
    orders: 'Orders',
    customers: 'Customers',
    promotions: 'Promotions',
    inventory: 'Inventory',
    payments: 'Payments',
  };
  return map[seg] ?? 'Commerce';
}

const opsByPath = new Map();
for (const src of COMMERCE_DRIFT_TARGET.sources) {
  const mount = COMMERCE_DRIFT_TARGET.mountBySource[src];
  const text = fs.readFileSync(path.join(srcRoot, src), 'utf8');
  let m;
  ROUTE_RE.lastIndex = 0;
  while ((m = ROUTE_RE.exec(text)) !== null) {
    const method = m[1].toLowerCase();
    const full = joinMount(mount, m[2]);
    if (!opsByPath.has(full)) opsByPath.set(full, new Set());
    opsByPath.get(full).add(method);
  }
}

const paths = [...opsByPath.keys()].sort((a, b) => {
  // static segments before params at same depth
  const score = (p) => p.replace(/\{[^}]+\}/g, '~').length;
  return score(a) - score(b) || a.localeCompare(b);
});

let body = `openapi: 3.0.3
info:
  title: AETHER Commerce API
  description: |
    Merchant commerce REST under \`/api/*\` (auth + tenant required).
    Minimal Wave 17 surface — path/method inventory for drift checks; DTOs remain code/tests.
  version: 0.1.0

servers:
  - url: /api
    description: Authenticated commerce API

tags:
  - name: Products
  - name: Orders
  - name: Customers
  - name: Promotions
  - name: Inventory
  - name: Payments

paths:
`;

for (const p of paths) {
  body += `  ${p}:\n`;
  for (const method of [...opsByPath.get(p)].sort()) {
    const opId = `${method}_${p.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
    body += `    ${method}:
      tags: [${tagForPath(p)}]
      summary: ${method.toUpperCase()} ${p}
      operationId: ${opId}
      responses:
        '200':
          description: OK
        '400':
          description: Bad request
        '401':
          description: Unauthorized
`;
  }
}

const out = path.join(backendRoot, 'openapi', 'commerce.yaml');
fs.writeFileSync(out, body, 'utf8');
console.log(`Wrote ${out} (${paths.length} paths)`);
