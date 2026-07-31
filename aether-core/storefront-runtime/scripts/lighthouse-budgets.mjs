import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Real Chrome Lighthouse against storefront-runtime fixture route.
 * Budgets align with docs/storefront-lighthouse.md (perf ≥ 0.85, LCP ≤ 2.5s, CLS ≤ 0.1).
 */

const base = process.env.LH_BASE_URL ?? 'http://127.0.0.1:4177';
const path = process.env.LH_PATH ?? '/lh-fixture';
const minScore = Number(process.env.LH_MIN_SCORE ?? '0.85');
const maxLcpMs = Number(process.env.LH_MAX_LCP_MS ?? '2500');
const maxCls = Number(process.env.LH_MAX_CLS ?? '0.1');
const outDir = resolve(process.cwd(), process.env.LH_OUT_DIR ?? '.lighthouse');
const outFile = resolve(outDir, 'storefront-fixture.json');

mkdirSync(outDir, { recursive: true });

execSync(
  `npx lighthouse ${base}${path} --only-categories=performance --chrome-flags="--headless --no-sandbox" --output=json --output-path=${outFile} --quiet`,
  { stdio: 'inherit' }
);

const report = JSON.parse(readFileSync(outFile, 'utf8'));
const a = report.audits ?? {};
const performanceScore = report.categories?.performance?.score ?? null;
const lcpMs = a['largest-contentful-paint']?.numericValue ?? null;
const cls = a['cumulative-layout-shift']?.numericValue ?? null;

const summary = {
  path,
  performanceScore,
  lcpMs,
  cls,
  lcpDisplay: a['largest-contentful-paint']?.displayValue ?? 'n/a',
  clsDisplay: a['cumulative-layout-shift']?.displayValue ?? 'n/a',
};

writeFileSync(resolve(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));

const failures = [];
if (performanceScore === null || performanceScore < minScore) {
  failures.push(`performance score ${performanceScore ?? 'n/a'} < ${minScore}`);
}
if (lcpMs === null || lcpMs > maxLcpMs) {
  failures.push(`LCP ${lcpMs ?? 'n/a'}ms > ${maxLcpMs}ms`);
}
if (cls === null || cls > maxCls) {
  failures.push(`CLS ${cls ?? 'n/a'} > ${maxCls}`);
}

if (failures.length > 0) {
  console.error('\nStorefront Lighthouse budget gate failed:');
  for (const msg of failures) console.error(`  - ${msg}`);
  process.exit(1);
}

console.log(
  `\nPASS — fixture meets perf>=${minScore}, LCP<=${maxLcpMs}ms, CLS<=${maxCls}`
);
