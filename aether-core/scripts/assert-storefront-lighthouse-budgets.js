#!/usr/bin/env node
/**
 * Assert storefront Lighthouse budget doc is present with locked Birth/P15 metrics.
 * Full Lighthouse browser runs remain manual/pilot (see storefront-lighthouse.md).
 * This gate prevents silent budget-doc drift in CI.
 */
const fs = require('fs');
const path = require('path');

const docPath = path.join(__dirname, '..', 'docs', 'storefront-lighthouse.md');
if (!fs.existsSync(docPath)) {
  console.error('Missing docs/storefront-lighthouse.md');
  process.exit(1);
}

const text = fs.readFileSync(docPath, 'utf8');
const required = [
  'Performance score',
  '≥ 85',
  'LCP',
  '≤ 2.5s',
  'CLS',
  '≤ 0.1',
  'ProductGrid',
  'localhost:4177',
];

const missing = required.filter((needle) => !text.includes(needle));
if (missing.length) {
  console.error('storefront-lighthouse.md missing required budget markers:', missing.join(', '));
  process.exit(1);
}

console.log('OK: storefront Lighthouse budget doc asserts locked markers (4177 + ProductGrid budgets).');
