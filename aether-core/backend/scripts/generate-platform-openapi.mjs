/**
 * Generator for openapi/platform.yaml from always-on non-commerce/admin mounts.
 * Feature-gated experimental mounts are intentionally excluded.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLATFORM_DRIFT_TARGET } from './openapi-route-drift.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(backendRoot, 'src');

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

function tagForPath(p) {
  const seg = p.split('/').filter(Boolean)[0];
  const map = {
    auth: 'Auth',
    media: 'Media',
    emails: 'Emails',
    suppliers: 'Suppliers',
    approvals: 'Approvals',
    outcomes: 'Outcomes',
    autonomous: 'Autonomous',
    plugins: 'Plugins',
    'hive-mind': 'HiveMind',
    bilateral: 'Bilateral',
  };
  return map[seg] ?? 'Platform';
}

const opsByPath = new Map();
for (const src of PLATFORM_DRIFT_TARGET.sources) {
  const mount = PLATFORM_DRIFT_TARGET.mountBySource[src];
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
  const score = (p) => p.replace(/\{[^}]+\}/g, '~').length;
  return score(a) - score(b) || a.localeCompare(b);
});

const tags = [...new Set(paths.map(tagForPath))].sort();

let body = `openapi: 3.0.3
info:
  title: AETHER Platform API
  description: |
    Always-on platform REST under \`/api/*\` (auth + tenant required except auth login/refresh).
    Wave 18 path/method inventory for drift checks.
    Excluded (feature-gated experimental): predictive, self-evolving, agentic, physical, co-ownership.
  version: 0.1.0

servers:
  - url: /api
    description: Authenticated platform API

tags:
${tags.map((t) => `  - name: ${t}`).join('\n')}

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

const out = path.join(backendRoot, 'openapi', 'platform.yaml');
fs.writeFileSync(out, body, 'utf8');
const opCount = [...opsByPath.values()].reduce((n, s) => n + s.size, 0);
console.log(`Wrote ${out} (${paths.length} paths, ${opCount} ops)`);
