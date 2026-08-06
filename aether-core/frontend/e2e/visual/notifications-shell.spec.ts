import { test, expect } from '@playwright/test';
import { setupVisualPage } from './setup';

test.describe('Notifications shell', () => {
  test.beforeEach(async ({ page }) => {
    await setupVisualPage(page);
  });

  test('bell opens panel and mark all read clears badge', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    const bell = page.getByTestId('app-top-bar').getByTestId('notification-bell');
    await expect(bell).toBeVisible({ timeout: 15000 });

    const badge = bell.locator('span.rounded-full');
    await expect(badge).toBeVisible({ timeout: 15000 });

    await bell.click();
    const popover = page.getByTestId('notification-popover');
    await expect(popover).toBeVisible();
    await expect(popover.getByTestId('notification-panel')).toBeVisible();

    await popover.getByRole('button', { name: /Alles gelezen|Mark all read/i }).click();
    await expect(badge).toHaveCount(0);
  });

  test('popover expands grouped notification to show child rows', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    const bell = page.getByTestId('app-top-bar').getByTestId('notification-bell');
    await expect(bell).toBeVisible({ timeout: 15000 });
    await bell.click();
    const popover = page.getByTestId('notification-popover');
    await expect(popover).toBeVisible();

    const groupedRow = popover.getByRole('button', { name: /Goedkeuring vereist/i });
    await expect(groupedRow).toBeVisible({ timeout: 10000 });
    await groupedRow.click();

    // exact:true — parent group summary also contains this substring
    await expect(popover.getByText('Terugbetaling € 89,50', { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await expect(popover.getByText('Prijsbulk wijziging', { exact: true })).toBeVisible();
  });
});
