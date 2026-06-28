/**
 * One-off axe diagnostic — run after build:
 *   node scripts/diagnose-a11y.mjs
 */
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setupVisualPage } from '../e2e/visual/setup.js';

const ROUTES = [
  '/',
  '/command-center',
  '/approvals',
  '/insights',
  '/timeline',
  '/suppliers',
  '/settings',
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const path of ROUTES) {
  await setupVisualPage(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(path);
  await page.waitForSelector('[role="main"]', { timeout: 15000 });

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  const serious = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );

  console.log(`\n=== ${path} (${serious.length} serious/critical) ===`);
  for (const v of serious) {
    console.log(`  ${v.id} (${v.impact}, ${v.nodes.length} nodes): ${v.help}`);
    for (const n of v.nodes.slice(0, 3)) {
      console.log(`    - ${n.target.join(' > ')}`);
      if (n.failureSummary) console.log(`      ${n.failureSummary.replace(/\n/g, ' ')}`);
    }
  }
}

await browser.close();
