import { test, expect } from '@playwright/test';
import { setupVisualPage } from '../visual/setup';

test('skip link activates and focuses main content', async ({ page }) => {
  await setupVisualPage(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/command-center');
  const skip = page.getByRole('link', { name: /Ga naar hoofdinhoud|Skip to main content/i });
  await skip.focus();
  await skip.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

test('keyboard: command bar combobox accepts input', async ({ page }) => {
  await setupVisualPage(page);
  await page.goto('/command-center');
  await expect(page.getByTestId('command-center-ready')).toBeVisible({ timeout: 15000 });
  const combobox = page.getByRole('combobox').first();
  await combobox.focus();
  await combobox.fill('test');
  await expect(combobox).toHaveValue('test');
});

test('keyboard: Escape closes mobile nav sheet', async ({ page }) => {
  await setupVisualPage(page);
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/command-center');
  await page.getByRole('button', { name: /Menu openen/i }).click();
  await expect(page.getByRole('navigation', { name: /Mobiele navigatie/i })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: /Mobiele navigatie/i })).toBeHidden();
});
