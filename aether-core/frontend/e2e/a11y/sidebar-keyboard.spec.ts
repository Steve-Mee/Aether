import { test, expect } from '@playwright/test';
import { setupVisualPage } from '../visual/setup';

test('sidebar: active nav link is focusable with visible focus', async ({ page }) => {
  await setupVisualPage(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/approvals');
  await expect(page.getByRole('main')).toBeVisible({ timeout: 15000 });

  const sidebar = page.getByRole('navigation', { name: /Hoofdnavigatie|Main navigation/i });
  await expect(sidebar).toBeVisible();

  const activeLink = sidebar.locator('a[aria-current="page"]').first();
  await expect(activeLink).toBeVisible();
  await activeLink.focus();
  await expect(activeLink).toBeFocused();
});
