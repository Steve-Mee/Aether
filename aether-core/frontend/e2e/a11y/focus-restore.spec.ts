import { test, expect } from '@playwright/test';
import { setupVisualPage } from '../visual/setup';

test('mobile nav: Escape closes sheet and restores focus to menu button', async ({ page }) => {
  await setupVisualPage(page);
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/command-center');
  await expect(page.getByTestId('command-center-ready')).toBeVisible({ timeout: 15000 });

  const menuButton = page.getByRole('button', { name: /Menu openen/i });
  await menuButton.focus();
  await menuButton.click();
  await expect(page.getByRole('navigation', { name: /Mobiele navigatie/i })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: /Mobiele navigatie/i })).toBeHidden();
  await expect(menuButton).toBeFocused();
});

test('command palette: Escape closes dialog and restores focus to trigger', async ({ page }) => {
  await setupVisualPage(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/command-center');
  await expect(page.getByTestId('command-center-ready')).toBeVisible({ timeout: 15000 });

  const combobox = page.getByRole('combobox', { name: /Natuurlijke taal opdracht/i });
  await combobox.focus();
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(combobox).toBeFocused();
});
