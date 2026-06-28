import { test, expect } from '@playwright/test';
import { getCommandBarInput, setupFlowPage } from '../shared/flow-helpers';

test.describe('Cross-screen flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupFlowPage(page);
  });

  test('command execution navigates to approvals with consistent queue', async ({ page }) => {
    await page.goto('/suppliers');
    const input = getCommandBarInput(page);
    await input.fill('Toon goedkeuringen');
    await input.press('Enter');

    await expect(page.getByTestId('command-api-response')).toBeVisible({ timeout: 15000 });
    await page.waitForURL(/\/approvals/, { timeout: 15000 });

    await expect(page.getByTestId('approval-card-approval-refund-1')).toBeVisible();
  });

  test('approval resolve shows success feedback across screens', async ({ page }) => {
    await page.goto('/command-center');
    await expect(page.getByTestId('command-center-ready')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('home-outcome-metrics')).toContainText(/High-risk goedkeuringen/i, {
      timeout: 15000,
    });

    await page.goto('/approvals');
    await expect(page.getByTestId('approval-card-approval-refund-1')).toBeVisible({
      timeout: 15000,
    });

    await page.getByTestId('approval-approve-approval-refund-1').click();
    await page.getByRole('button', { name: 'Bevestigen' }).click();

    await expect(page.getByTestId('approval-card-approval-refund-1')).toHaveCount(0, {
      timeout: 15000,
    });
    await expect(page.getByTestId('approvals-page')).toContainText('Goedgekeurd en uitgevoerd', {
      timeout: 15000,
    });

    await page.goto('/command-center');
    await expect(page.getByTestId('command-center-ready')).toBeVisible({ timeout: 15000 });
    // High-risk card removed after resolve — remaining pending is low-risk only
    await expect(page.getByTestId('home-outcome-metrics')).not.toContainText(/High-risk goedkeuringen/i, {
      timeout: 15000,
    });

    await page.goto('/timeline');
    await expect(
      page.getByTestId('activity-row-e2e-activity-approval-approval-refund-1')
    ).toBeVisible({ timeout: 15000 });
  });
});
