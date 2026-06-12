import { test, expect } from '@playwright/test';
import { getCommandBarInput, setupFlowPage } from '../shared/flow-helpers';
import { setCommandExecuteFails } from '../shared/playwrightApiState';

test.describe('Command bar flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupFlowPage(page);
  });

  test('submits NL command and shows API result card', async ({ page }) => {
    await page.goto('/suppliers');
    await expect(page.getByTestId('global-command-bar')).toBeVisible({ timeout: 15000 });

    const input = getCommandBarInput(page);
    await expect(input).toBeVisible({ timeout: 15000 });
    await input.fill('Toon openstaande goedkeuringen');
    await input.press('Enter');

    await expect(page.getByTestId('command-api-response')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('command-api-response')).toContainText('E2E uitgevoerd');
  });

  test('shows error card when command API fails', async ({ page }) => {
    setCommandExecuteFails(true);

    await page.goto('/suppliers');
    await expect(page.getByTestId('global-command-bar')).toBeVisible({ timeout: 15000 });
    const input = getCommandBarInput(page);
    await expect(input).toBeVisible({ timeout: 15000 });
    await input.fill('Mislukt commando');
    await input.press('Enter');

    await expect(page.getByTestId('command-error-card')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('command-api-response')).toHaveCount(0);
  });
});
