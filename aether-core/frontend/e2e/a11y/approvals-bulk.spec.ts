import { test, expect } from '@playwright/test';
import { setupVisualPage } from '../visual/setup';

test('approval bulk checkbox has accessible name', async ({ page }) => {
  await setupVisualPage(page);
  await page.goto('/approvals');
  await expect(page.getByTestId('approvals-page')).toBeVisible({ timeout: 15000 });

  const selectAll = page.getByRole('button', { name: /Selecteer alles low-risk|Select all low-risk/i });
  if (await selectAll.isVisible()) {
    await selectAll.click();
  }

  const checkbox = page.getByRole('checkbox').first();
  if (await checkbox.isVisible()) {
    await expect(checkbox).toHaveAccessibleName(/.+/);
  }
});
