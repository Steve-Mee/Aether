/**
 * Generator for openapi/admin.yaml from admin-command-bar + admin bilateral routes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADMIN_DRIFT_TARGET } from './openapi-route-drift.mjs';

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
  const top = p.split('/').filter(Boolean)[0] ?? 'admin';
  const map = {
    command: 'Command',
    suggestions: 'Suggestions',
    'proactive-suggestions': 'ProactiveSuggestions',
    'ui-event': 'UiEvent',
    dashboard: 'Dashboard',
    commands: 'Commands',
    activity: 'Activity',
    overview: 'Overview',
    agents: 'Agents',
    notifications: 'Notifications',
    workflows: 'Workflows',
    autonomy: 'Autonomy',
    explain: 'Explain',
    'truth-status': 'Truth',
    'truth-review': 'Truth',
    'operating-metrics': 'OperatingMetrics',
    policies: 'Policies',
    settings: 'Settings',
    'connected-services': 'ConnectedServices',
    goals: 'Goals',
    events: 'Events',
    observability: 'Observability',
    federated: 'Federated',
    brain: 'Brain',
    bilateral: 'Bilateral',
  };
  return map[top] ?? 'Admin';
}

const opsByPath = new Map();
for (const src of ADMIN_DRIFT_TARGET.sources) {
  const mount = ADMIN_DRIFT_TARGET.mountBySource?.[src] ?? '';
  const text = fs.readFileSync(path.join(srcRoot, src), 'utf8');
  let m;
  ROUTE_RE.lastIndex = 0;
  while ((m = ROUTE_RE.exec(text)) !== null) {
    const method = m[1].toLowerCase();
    const full = mount ? joinMount(mount, m[2]) : normalizePath(m[2]);
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
  title: AETHER Admin Command Bar API
  description: |
    Admin API under \`/api/admin/*\` (auth + tenant required).
    Wave 18 path/method inventory for drift checks — includes \`/bilateral/audit\`.
  version: 0.1.0

servers:
  - url: /api/admin
    description: Authenticated admin command-bar API

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

const out = path.join(backendRoot, 'openapi', 'admin.yaml');
fs.writeFileSync(out, body, 'utf8');
console.log(
  `Wrote ${out} (${paths.length} paths, ${[...opsByPath.values()].reduce((n, s) => n + s.size, 0)} ops)`
);
