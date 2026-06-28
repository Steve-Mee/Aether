import { test, expect } from '@playwright/test';
import { getCommandBarInput, setupFlowPage } from '../shared/flow-helpers';

test.describe('Insights after command flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupFlowPage(page);
  });

  test('autonomous metric updates after command execution', async ({ page }) => {
    await page.goto('/insights');
    await expect(page.getByTestId('insights-metrics-grid')).toBeVisible({ timeout: 15000 });
    const metric = page.getByTestId('insights-metric-autonomous');
    await expect(metric).toBeVisible();
    const before = await metric.locator('.text-display').textContent();
    expect(before?.trim()).toBe('8');

    await page.goto('/suppliers');
    await expect(page.getByTestId('global-command-bar')).toBeVisible({ timeout: 15000 });
    const input = getCommandBarInput(page);
    await input.fill('Toon goedkeuringen');
    await input.press('Enter');
    await expect(page.getByTestId('command-api-response')).toBeVisible({ timeout: 15000 });

    await page.goto('/insights');
    await expect(page.getByTestId('insights-metrics-grid')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('insights-error-banner')).toHaveCount(0);
    const after = await page.getByTestId('insights-metric-autonomous').locator('.text-display').textContent();
    expect(after?.trim()).toBe('9');
  });
});
