import { test, expect } from '@playwright/test';
import { setupVisualPage } from '../visual/setup';
import {
  A11Y_CORE_ROUTES,
  A11Y_DEEP_ROUTES,
  formatViolationsReport,
  isSeriousOrCritical,
  scanPageA11y,
} from './axe-scan';

function attachAxeReport(
  path: string,
  violations: Awaited<ReturnType<typeof scanPageA11y>>,
  testInfo: import('@playwright/test').TestInfo
) {
  return testInfo.attach(`axe-${path.replace(/\//g, '_') || 'root'}.md`, {
    body: formatViolationsReport(path, violations),
    contentType: 'text/markdown',
  });
}

for (const path of A11Y_CORE_ROUTES) {
  test(`axe gate: ${path}`, async ({ page }, testInfo) => {
    await setupVisualPage(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(path);
    if (path === '/' || path === '/command-center') {
      await expect(page.getByTestId('command-center-ready')).toBeVisible({ timeout: 15000 });
    } else {
      await expect(page.getByRole('main')).toBeVisible({ timeout: 15000 });
    }

    const violations = await scanPageA11y(page);
    await attachAxeReport(path, violations, testInfo);

    const serious = violations.filter(isSeriousOrCritical);
    expect(serious, formatViolationsReport(path, serious)).toHaveLength(0);
  });
}

for (const path of A11Y_DEEP_ROUTES) {
  test(`axe report (deep): ${path}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    if (path === '/login') {
      await page.addInitScript(() => {
        localStorage.removeItem('aether.session.v1');
      });
      await page.goto(path);
      await expect(page.getByTestId('login-page')).toBeVisible({ timeout: 15000 });
    } else {
      await setupVisualPage(page);
      await page.goto(path);
      await expect(page.getByRole('main')).toBeVisible({ timeout: 15000 });
    }

    const violations = await scanPageA11y(page);
    await attachAxeReport(path, violations, testInfo);

    const serious = violations.filter(isSeriousOrCritical);
    if (serious.length > 0) {
      console.warn(`[a11y:deep] ${path}: ${serious.length} serious/critical rule(s)`);
    }
  });
}
