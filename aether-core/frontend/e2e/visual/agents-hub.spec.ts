import { test, expect } from '@playwright/test';
import { setupVisualPage } from './setup';

test.describe('Agents hub /agents', () => {
  test.beforeEach(async ({ page }) => {
    await setupVisualPage(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
  });

  test('renders agent cards with status and detail panel', async ({ page }) => {
    await expect(page.getByTestId('agents-page')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('agent-card-inventory')).toBeVisible();
    await expect(page.getByTestId('agent-card-pricing')).toBeVisible();
    await expect(page.getByTestId('agent-detail-panel')).toBeVisible();
    await expect(page.getByTestId('activity-row-e2e-agent-act-1')).toBeVisible();
  });

  test('card selection updates activity list', async ({ page }) => {
    await page.getByTestId('agent-card-pricing').click();
    await expect(page.getByTestId('activity-row-e2e-agent-act-2')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('activity-row-e2e-agent-act-1')).toHaveCount(0);
  });

  test('row click opens activity detail sheet', async ({ page }) => {
    await page.getByTestId('activity-row-e2e-agent-act-1').click();
    await expect(page.getByTestId('activity-detail-sheet')).toBeVisible();
  });

  test('inline explain opens explainability sheet', async ({ page }) => {
    await page.getByTestId('activity-row-explain-e2e-agent-act-1').click();
    await expect(page.getByText('E2E explain summary')).toBeVisible({ timeout: 10000 });
  });
});
