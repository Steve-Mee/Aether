import { test, expect } from '@playwright/test';
import { getCommandBarInput, setupFlowPage } from '../shared/flow-helpers';

test.describe('Command undo flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupFlowPage(page);
  });

  test('undoes last command and clears undo button', async ({ page }) => {
    await page.goto('/suppliers');
    await expect(page.getByTestId('global-command-bar')).toBeVisible({ timeout: 15000 });

    const input = getCommandBarInput(page);
    await input.fill('Sync leveranciers');
    await input.press('Enter');

    await expect(page.getByTestId('command-api-response')).toBeVisible({ timeout: 15000 });
    const undoButton = page.getByRole('button', { name: 'Ongedaan maken' });
    await expect(undoButton).toBeVisible();

    await undoButton.click();

    await expect(undoButton).toHaveCount(0, { timeout: 15000 });
    await expect(page.getByTestId('command-api-response')).toContainText('Teruggedraaid');
  });
});
