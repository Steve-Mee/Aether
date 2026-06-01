import { test, expect } from '@playwright/test';
import { mockDashboard, mockPolicy } from './fixtures';

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
    if (url.includes('/api/admin/commands')) {
      await route.fulfill({ json: { commands: [] } });
      return;
    }
    if (url.includes('/api/admin/ui-event')) {
      await route.fulfill({ json: { success: true } });
      return;
    }
    if (url.includes('/api/approvals')) {
      await route.fulfill({ json: [] });
      return;
    }
    if (url.includes('/api/emails') || url.includes('/api/autonomous')) {
      await route.fulfill({ json: [] });
      return;
    }
    await route.fulfill({ status: 200, json: {} });
  });
}

test.describe('Admin UI visual smoke', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page);
  });

  test('command center home', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('command-center-ready')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('command-center.png');
  });

  test('workstream', async ({ page }) => {
    await page.goto('/workstream');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page).toHaveScreenshot('workstream.png');
  });

  test('approvals', async ({ page }) => {
    await page.goto('/approvals');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page).toHaveScreenshot('approvals.png');
  });
});
