import { test, expect } from '@playwright/test';
import { setupVisualPage } from '../visual/setup';

test('global NL bar: ArrowDown sets aria-activedescendant on active suggestion', async ({ page }) => {
  await setupVisualPage(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/approvals');
  await expect(page.getByRole('main')).toBeVisible({ timeout: 15000 });

  const bar = page.getByTestId('global-command-bar');
  const combobox = bar.getByRole('combobox');
  await combobox.focus();
  await page.keyboard.press('ArrowDown');

  const activeDescendant = await combobox.getAttribute('aria-activedescendant');
  expect(activeDescendant, 'combobox should expose aria-activedescendant after ArrowDown').toBeTruthy();
  expect(activeDescendant).toMatch(/^global-suggestion-/);

  const activeOption = page.locator(`#${activeDescendant!.replace(/:/g, '\\:')}`);
  await expect(activeOption).toBeVisible();
  await expect(activeOption).toHaveAttribute('aria-selected', 'true');
});
