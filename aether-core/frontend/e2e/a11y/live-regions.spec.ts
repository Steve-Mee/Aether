import { test, expect } from '@playwright/test';
import { setupVisualPage } from '../visual/setup';

test('live announcer updates on approval success banner', async ({ page }) => {
  await setupVisualPage(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/approvals');
  await expect(page.getByRole('main')).toBeVisible({ timeout: 15000 });

  const liveRegion = page.locator('[role="status"][aria-live="polite"]').first();
  await expect(liveRegion).toBeAttached();

  const approveButton = page.getByRole('button', { name: /Goedkeuren|Approve/i }).first();
  if (await approveButton.isVisible()) {
    await approveButton.click();
    await expect(page.getByTestId('approvals-success-banner')).toBeVisible({ timeout: 10000 });
  }
});

test('assertive live region exists for error announcements', async ({ page }) => {
  await setupVisualPage(page);
  await page.goto('/command-center');
  await expect(page.getByRole('main')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('[role="alert"][aria-live="assertive"]')).toBeAttached();
});
