import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from '../shared/auth';
import { mockApprovalsPending, mockDashboard, mockMerchantSettings, mockPolicy } from './fixtures';

async function mockAdminApi(page: import('@playwright/test').Page) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/api/admin/dashboard') || url.includes('/api/admin/events/stream')) {
      await route.fulfill({ json: mockDashboard });
      return;
    }
    if (url.includes('/api/admin/policies/approval')) {
      await route.fulfill({ json: mockPolicy });
      return;
    }
    if (url.includes('/api/admin/truth-status')) {
      await route.fulfill({
        json: {
          version: '1',
          updatedAt: new Date().toISOString(),
          claimPolicy: 'test',
          features: {},
          phases: {},
        },
      });
      return;
    }
    if (url.includes('/api/admin/activity')) {
      await route.fulfill({ json: { items: [], source: 'live' } });
      return;
    }
    if (url.includes('/api/approvals')) {
      await route.fulfill({ json: mockApprovalsPending });
      return;
    }
    if (url.includes('/api/admin/settings')) {
      await route.fulfill({ json: mockMerchantSettings });
      return;
    }
    if (url.includes('/api/admin/suggestions')) {
      await route.fulfill({ json: { nowRelevant: [], groups: [], suggestions: [] } });
      return;
    }
    await route.fulfill({ status: 200, json: {} });
  });
}

test.describe('Notifications shell', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
    await mockAdminApi(page);
    await page.addInitScript(() => {
      (window as unknown as { __AETHER_DISABLE_LIVE_DEMO__: boolean }).__AETHER_DISABLE_LIVE_DEMO__ =
        true;
    });
  });

  test('bell opens panel and mark all read clears badge', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    const topBar = page.getByTestId('app-top-bar');
    const bell = topBar.getByTestId('notification-bell');
    await expect(bell).toBeVisible();

    const badge = bell.locator('span.rounded-full');
    await expect(badge).toBeVisible();

    await bell.click();
    const popover = page.getByTestId('notification-popover');
    await expect(popover).toBeVisible();
    await expect(popover.getByTestId('notification-panel')).toBeVisible();

    await popover.getByRole('button', { name: /Alles gelezen|Mark all read/i }).click();
    await expect(badge).toHaveCount(0);
  });
});
