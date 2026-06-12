import { test, expect } from '@playwright/test';
import { setupFlowPage } from '../shared/flow-helpers';

const HIGH_RISK_ID = 'approval-refund-1';
const LOW_RISK_ID = 'approval-mail-1';

test.describe('Approvals bulk flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupFlowPage(page);
  });

  test('auto-applies low-risk items and keeps high-risk pending', async ({ page }) => {
    await page.goto('/approvals');
    await expect(page.getByTestId(`approval-card-${LOW_RISK_ID}`)).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId(`approval-card-${HIGH_RISK_ID}`)).toBeVisible();

    await page.getByTestId('approvals-bulk-auto-apply').click();

    await expect(page.getByTestId(`approval-card-${LOW_RISK_ID}`)).toHaveCount(0, {
      timeout: 15000,
    });
    await expect(page.getByTestId(`approval-card-${HIGH_RISK_ID}`)).toBeVisible();
  });
});
