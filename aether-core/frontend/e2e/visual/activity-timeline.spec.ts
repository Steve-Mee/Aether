import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from '../shared/auth';
import { mockApprovalsPending, mockDashboard, mockMerchantSettings } from './fixtures';

async function mockActivityApi(page: import('@playwright/test').Page) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/api/admin/activity')) {
      const now = new Date().toISOString();
      await route.fulfill({
        json: {
          items: [
            {
              id: 'demo-1',
              source: 'audit',
              at: now,
              actionType: 'autonomy_execute',
              actionLabel: 'Autonome sync',
              description: 'Voorraad en prijzen gesynchroniseerd met Shopify (142 SKU)',
              module: 'inventory-pricing',
              category: 'sync',
              risk: 'low',
              status: 'approved',
              executor: 'aether',
            },
          ],
          source: 'live',
        },
      });
      return;
    }
    if (url.includes('/api/admin/settings')) {
      await route.fulfill({ json: mockMerchantSettings });
      return;
    }
    if (url.includes('/api/admin/truth-status')) {
      await route.fulfill({
        json: {
          version: '1',
          updatedAt: new Date().toISOString(),
          claimPolicy: 'test',
          features: { 'activity-log': { status: 'partial' } },
          phases: {},
        },
      });
      return;
    }
    if (url.includes('/api/admin/dashboard') || url.includes('/api/admin/events/stream')) {
      await route.fulfill({ json: mockDashboard });
      return;
    }
    if (url.includes('/api/admin/suggestions')) {
      await route.fulfill({ json: { nowRelevant: [], groups: [], suggestions: [] } });
      return;
    }
    if (url.includes('/api/admin/ui-event')) {
      await route.fulfill({ json: { success: true } });
      return;
    }
    if (url.includes('/api/approvals')) {
      await route.fulfill({ json: mockApprovalsPending });
      return;
    }
    if (url.includes('/api/emails') || url.includes('/api/autonomous')) {
      await route.fulfill({ json: [] });
      return;
    }
    await route.fulfill({ status: 200, json: {} });
  });
}

test.describe('Activity log /timeline', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await mockActivityApi(page);
    await page.goto('/timeline');
    await page.waitForLoadState('networkidle');
  });

  test('renders header and demo feed', async ({ page }) => {
    await expect(page.getByTestId('activity-page')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('activity-period-toolbar')).toBeVisible();
    await expect(page.getByTestId('activity-filter-bar')).toBeVisible();
    await expect(page.getByTestId('activity-list')).toBeVisible();
    await expect(page.getByTestId('activity-row-demo-1')).toBeVisible();
  });

  test('sidebar nav includes Activiteit link to timeline', async ({ page }) => {
    const sidebar = page.getByRole('navigation', { name: /Hoofdnavigatie/i });
    const timelineLink = sidebar.getByRole('link', { name: /Activiteit|Activity/i });
    await expect(timelineLink).toBeVisible({ timeout: 15000 });
    await expect(timelineLink).toHaveAttribute('href', '/timeline');

    await page.goto('/approvals');
    await expect(page.getByTestId('approvals-page')).toBeVisible({ timeout: 15000 });
    await page
      .getByRole('navigation', { name: /Hoofdnavigatie/i })
      .getByRole('link', { name: /Activiteit|Activity/i })
      .click();
    await expect(page).toHaveURL(/\/timeline/);
    await expect(page.getByTestId('activity-page')).toBeVisible({ timeout: 15000 });
  });

  test('opens detail sheet on row click', async ({ page }) => {
    const row = page.getByTestId('activity-row-demo-1');
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.click();
    await expect(page.getByTestId('activity-detail-sheet')).toBeVisible();
  });
});
