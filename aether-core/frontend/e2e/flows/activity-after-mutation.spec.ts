import { test, expect } from '@playwright/test';
import { setupFlowPage } from '../shared/flow-helpers';

const HIGH_RISK_ID = 'approval-refund-1';

test.describe('Activity after mutation flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupFlowPage(page);
  });

  test('shows approval activity on timeline after high-risk approve', async ({ page }) => {
    await page.goto('/approvals');
    await expect(page.getByTestId(`approval-card-${HIGH_RISK_ID}`)).toBeVisible({
      timeout: 15000,
    });

    await page.getByTestId(`approval-approve-${HIGH_RISK_ID}`).click();
    await page.getByRole('button', { name: 'Bevestigen' }).click();

    await expect(page.getByTestId(`approval-card-${HIGH_RISK_ID}`)).toHaveCount(0, {
      timeout: 15000,
    });

    await page.goto('/timeline');
    await expect(page.getByTestId('activity-list')).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByTestId('activity-row-e2e-activity-approval-approval-refund-1')
    ).toBeVisible({ timeout: 15000 });
  });
});
