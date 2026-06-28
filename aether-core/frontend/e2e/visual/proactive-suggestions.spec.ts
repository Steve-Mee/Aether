import { test, expect } from '@playwright/test';
import { gotoCommandCenter } from './command-helpers';
import { setupVisualPage } from './setup';

test.describe('Proactive suggestions', () => {
  test.beforeEach(async ({ page }) => {
    await setupVisualPage(page);
    await page.addInitScript(() => {
      localStorage.removeItem('aether_proactive_suggestions');
    });
  });

  test('command center shows proactive cards with execute actions', async ({ page }) => {
    await gotoCommandCenter(page);
    await expect(page.getByTestId('proactive-suggestions-list')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('proactive-suggestion-e2e-proactive-1')).toBeVisible();
    await expect(page.getByTestId('proactive-execute-e2e-proactive-1')).toBeVisible();
    await expect(page.getByTestId('proactive-suggestion-e2e-proactive-2')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('proactive-suggestions.png');
  });
});
