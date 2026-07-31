#!/usr/bin/env node
/**
 * Production dependency audit for CI.
 * Wraps `npm audit --omit=dev` and drops known false positives where the
 * installed version is already in the upstream patched range but the npm
 * advisory DB still reports a wider range.
 *
 * Allowlist entries must cite the GHSA + patched floor. Remove when npm catches up.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** @type {Array<{ id: string; packageName: string; patchedFrom: string; reason: string }>} */
const ALLOWLIST = [
  {
    id: 'GHSA-qwww-vcr4-c8h2',
    packageName: 'react-router',
    patchedFrom: '7.18.2',
    reason:
      'RSC-only CSRF; patched in react-router >=7.18.2 (and >=8.3.0). npm advisory range still lists <8.3.0 incorrectly.',
  },
];

function cmpSemver(a, b) {
  const pa = String(a).split('-')[0].split('.').map((n) => Number(n) || 0);
  const pb = String(b).split('-')[0].split('.').map((n) => Number(n) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

function installedVersion(packageName) {
  try {
    return require(`${packageName}/package.json`).version;
  } catch {
    return null;
  }
}

function isAllowlisted(viaEntry, packageName) {
  if (!viaEntry || typeof viaEntry !== 'object' || !viaEntry.url) return false;
  const id = String(viaEntry.url).match(/GHSA-[\w-]+/i)?.[0];
  if (!id) return false;
  const rule = ALLOWLIST.find((r) => r.id.toLowerCase() === id.toLowerCase() && r.packageName === packageName);
  if (!rule) return false;
  const ver = installedVersion(packageName);
  if (!ver) return false;
  return cmpSemver(ver, rule.patchedFrom) >= 0;
}

const proc = spawnSync('npm', ['audit', '--omit=dev', '--json'], {
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
  shell: process.platform === 'win32',
});

let report;
try {
  report = JSON.parse(proc.stdout || '{}');
} catch {
  console.error('Failed to parse npm audit JSON');
  console.error(proc.stdout);
  process.exit(1);
}

const vulns = report.vulnerabilities || {};
const remaining = [];

for (const [name, entry] of Object.entries(vulns)) {
  const via = Array.isArray(entry.via) ? entry.via : [];
  const advisoryVia = via.filter((v) => v && typeof v === 'object' && v.url);
  if (advisoryVia.length === 0) {
    // Dependency-only nodes (effects of another package) — skip if parent filtered
    continue;
  }
  const stillVulnerable = advisoryVia.some((v) => !isAllowlisted(v, name));
  if (!stillVulnerable) {
    console.log(`allowlisted: ${name} (${advisoryVia.map((v) => v.url).join(', ')})`);
    continue;
  }
  const severity = entry.severity || 'unknown';
  if (['moderate', 'high', 'critical'].includes(severity)) {
    remaining.push({ name, severity, via: advisoryVia });
  }
}

if (remaining.length === 0) {
  console.log('audit:ci PASS (production, moderate+)');
  process.exit(0);
}

console.error('audit:ci FAIL — production vulnerabilities remain:');
for (const item of remaining) {
  console.error(`  - ${item.name} [${item.severity}]`);
  for (const v of item.via) {
    console.error(`      ${v.title || ''} ${v.url || ''}`);
  }
}
process.exit(1);
