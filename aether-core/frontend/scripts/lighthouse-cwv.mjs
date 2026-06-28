import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const routes = [
  { name: 'command-center', path: '/command-center' },
  { name: 'insights', path: '/insights' },
];

const base = process.env.LH_BASE_URL ?? 'http://127.0.0.1:4173';
const minScore = Number(process.env.LH_MIN_SCORE ?? '0.75');
const results = {};
const failures = [];

for (const route of routes) {
  const out = `.lighthouse-${route.name}.json`;
  execSync(
    `npx lighthouse ${base}${route.path} --only-categories=performance --chrome-flags="--headless --no-sandbox" --output=json --output-path=${out} --quiet`,
    { stdio: 'inherit' },
  );
  const report = JSON.parse(readFileSync(out, 'utf8'));
  const a = report.audits;
  const performanceScore = report.categories?.performance?.score ?? null;
  results[route.name] = {
    lcp: a['largest-contentful-paint']?.displayValue ?? 'n/a',
    cls: a['cumulative-layout-shift']?.displayValue ?? 'n/a',
    fcp: a['first-contentful-paint']?.displayValue ?? 'n/a',
    performanceScore,
  };

  if (performanceScore === null || performanceScore < minScore) {
    failures.push(
      `${route.name}: score ${performanceScore ?? 'n/a'} < minimum ${minScore}`,
    );
  }
}

writeFileSync('.lighthouse-cwv-summary.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));

if (failures.length > 0) {
  console.error('\nLighthouse CWV gate failed:');
  for (const msg of failures) {
    console.error(`  - ${msg}`);
  }
  process.exit(1);
}

console.log(`\nPASS — all routes meet performance score >= ${minScore}`);
