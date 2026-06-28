import { test, expect } from '@playwright/test';
import { setupFlowPage } from '../shared/flow-helpers';

const HIGH_RISK_ID = 'approval-refund-1';

test.describe('Approvals resolve flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupFlowPage(page);
  });

  test('approves high-risk item and removes it from the list', async ({ page }) => {
    await page.goto('/approvals');
    await expect(page.getByTestId(`approval-card-${HIGH_RISK_ID}`)).toBeVisible({
      timeout: 15000,
    });

    await page.getByTestId(`approval-approve-${HIGH_RISK_ID}`).click();
    await page.getByRole('button', { name: 'Bevestigen' }).click();

    await expect(page.getByTestId(`approval-card-${HIGH_RISK_ID}`)).toHaveCount(0, {
      timeout: 15000,
    });
  });
});
