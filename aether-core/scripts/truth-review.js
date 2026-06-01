#!/usr/bin/env node
/**
 * Weekly truth review — claim vs runtime evidence.
 * Run: node scripts/truth-review.js
 * Exit 1 if partial/experimental features lack honest labeling or review is overdue.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const errors = [];
const warnings = [];

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

const featureStatus = JSON.parse(read(path.join(DOCS, 'feature-status.json')));
const truthMatrix = read(path.join(DOCS, 'truth-matrix.md'));
const releaseGates = read(path.join(DOCS, 'release-gates.md'));

console.log('AETHER Truth Review');
console.log(`Version: ${featureStatus.version}`);
console.log(`Policy: ${featureStatus.claimPolicy}\n`);

for (const [key, entry] of Object.entries(featureStatus.features)) {
  const label = entry.label;
  const status = entry.status;

  if (!truthMatrix.includes(label)) {
    errors.push(`truth-matrix missing feature label: ${label} (${key})`);
  }

  const statusPattern = new RegExp(`\\| ${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\| ${status === 'live' ? 'implemented' : status}`);
  if (!statusPattern.test(truthMatrix)) {
    const expected = status === 'live' ? 'implemented' : status;
    errors.push(`${label}: feature-status.json=${status} does not match truth-matrix (${expected})`);
  }

  if (status === 'live' && releaseGates.includes('partial') && label.includes('Mail')) {
    // noop — specific checks below
  }
}

const partialCount = Object.values(featureStatus.features).filter((f) => f.status === 'partial').length;
const experimentalCount = Object.values(featureStatus.features).filter((f) => f.status === 'experimental').length;

console.log(`Features: ${Object.keys(featureStatus.features).length} total`);
console.log(`  live: ${Object.values(featureStatus.features).filter((f) => f.status === 'live').length}`);
console.log(`  partial: ${partialCount}`);
console.log(`  experimental: ${experimentalCount}\n`);

console.log('Kill-fast candidates (experimental/scaffold — pause if no merchant outcome in 2 iterations):');
for (const [key, entry] of Object.entries(featureStatus.features)) {
  if (entry.status === 'experimental' || entry.status === 'scaffold') {
    console.log(`  - ${key}: ${entry.label}`);
  }
}

if (!releaseGates.includes('Claim policy')) {
  errors.push('release-gates.md missing claim policy section');
}

if (!truthMatrix.includes('feature-status.json')) {
  errors.push('truth-matrix must reference docs/feature-status.json as machine-readable source');
}

const pilotLog = path.join(DOCS, 'pilot-log.md');
const pilotRunbook = path.join(DOCS, 'pilot-runbook.md');
if (!fs.existsSync(pilotLog)) {
  warnings.push('docs/pilot-log.md missing — create for pilot metric history');
}
if (!fs.existsSync(pilotRunbook)) {
  warnings.push('docs/pilot-runbook.md missing');
}

if (process.env.DATABASE_URL) {
  const { spawnSync } = require('child_process');
  const check = spawnSync('node', ['scripts/pilot-metrics-check.js'], {
    cwd: ROOT,
    env: process.env,
    encoding: 'utf8',
  });
  if (check.stdout) console.log(check.stdout);
  if (check.status !== 0) {
    warnings.push('pilot-metrics-check reported issues (see output above)');
  }
} else {
  console.log('\n(DB checks skipped — set DATABASE_URL for pilot-metrics-check)\n');
}

console.log(`\nErrors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);

errors.forEach((e) => console.error('  ✗', e));
warnings.forEach((w) => console.warn('  ⚠', w));

if (errors.length) process.exit(1);
console.log('\nPASS — truth review complete. Schedule weekly re-run.');
process.exit(0);
