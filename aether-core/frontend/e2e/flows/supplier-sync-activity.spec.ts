import { test, expect } from '@playwright/test';
import { setupFlowPage } from '../shared/flow-helpers';

const SUPPLIER_ID = 'sup_flow_1';

test.describe('Supplier sync activity flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupFlowPage(page);
  });

  test('supplier monitor appears on activity timeline', async ({ page }) => {
    await page.goto('/suppliers');
    await expect(page.getByTestId(`supplier-card-${SUPPLIER_ID}`)).toBeVisible({
      timeout: 15000,
    });

    await page.getByTestId(`supplier-card-${SUPPLIER_ID}`).click();
    await expect(page.getByTestId('supplier-detail-sheet')).toBeVisible({ timeout: 15000 });

    const syncButton = page.getByRole('button', { name: /Handmatig syncen|Sync now/i });
    await syncButton.click();

    await page.goto('/timeline');
    await expect(page.getByTestId('activity-list')).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByTestId(`activity-row-e2e-activity-supplier-sync-${SUPPLIER_ID}`)
    ).toBeVisible({ timeout: 15000 });
  });
});
