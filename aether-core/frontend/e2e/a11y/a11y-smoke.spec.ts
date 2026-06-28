import { test, expect } from '@playwright/test';
import { setupVisualPage } from '../visual/setup';

const routes = [
  '/command-center',
  '/',
  '/approvals',
  '/insights',
  '/timeline',
  '/suppliers',
  '/settings',
  '/workstream',
] as const;

for (const path of routes) {
  test(`${path} has main landmark and h1`, async ({ page }) => {
    await setupVisualPage(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(path);
    await expect(page.getByRole('main')).toBeVisible({ timeout: 15000 });
    if (path === '/' || path === '/command-center') {
      await expect(page.getByTestId('command-center-ready')).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId('home-welcome-header')).toBeVisible();
    }
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15000 });
  });
}

test('skip link focuses main content', async ({ page }) => {
  await setupVisualPage(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/command-center');
  const skip = page.getByRole('link', { name: /Ga naar hoofdinhoud|Skip to main content/i });
  await skip.focus();
  await expect(skip).toBeFocused();
  await skip.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});
