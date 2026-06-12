import { test, expect } from '@playwright/test';
import { setupFlowPage } from '../shared/flow-helpers';

test.describe('Command palette flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupFlowPage(page);
  });

  test('opens palette with Ctrl+K and executes a suggestion', async ({ page }) => {
    await page.goto('/suppliers');
    await expect(page.getByTestId('global-command-bar')).toBeVisible({ timeout: 15000 });

    await page.keyboard.press('Control+k');
    const palette = page.getByRole('dialog', { name: "Commando's" });
    await expect(palette).toBeVisible({ timeout: 15000 });

    const firstOption = palette.getByRole('option').first();
    await firstOption.click();

    await expect(page.getByTestId('command-api-response')).toBeVisible({ timeout: 15000 });
    await expect(palette).toHaveCount(0);
  });
});
