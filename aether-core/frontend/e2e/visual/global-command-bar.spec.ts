import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from '../shared/auth';
import { mockApprovalsPending, mockConnectedServices, mockDashboard, mockMerchantSettings } from './fixtures';

async function mockAdminApi(page: import('@playwright/test').Page) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/api/admin/dashboard') || url.includes('/api/admin/events/stream')) {
      await route.fulfill({ json: mockDashboard });
      return;
    }
    if (url.includes('/api/admin/settings')) {
      await route.fulfill({ json: mockMerchantSettings });
      return;
    }
    if (url.includes('/api/admin/connected-services')) {
      await route.fulfill({ json: mockConnectedServices });
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
    if (url.includes('/api/approvals')) {
      await route.fulfill({ json: mockApprovalsPending });
      return;
    }
    if (url.includes('/api/admin/suggestions')) {
      await route.fulfill({
        json: {
          nowRelevant: [
            {
              id: 'ctx-approvals-1',
              label: 'Behandel goedkeuringen',
              command: 'Toon high-risk goedkeuringen',
              intentId: 'HIGH_RISK_APPROVALS',
              category: 'goedkeuringen',
              source: 'dashboard',
              priority: 10,
            },
          ],
          groups: [],
          suggestions: [
            {
              id: 'static-pricing',
              label: 'Optimaliseer prijzen',
              command: 'Optimaliseer prijzen deze week',
              intentId: 'PRICING_OPTIMIZE',
              category: 'prijs',
              source: 'static',
              priority: 5,
            },
          ],
        },
      });
      return;
    }
    if (url.includes('/api/admin/ui-event')) {
      await route.fulfill({ json: { success: true } });
      return;
    }
    await route.fulfill({ status: 200, json: {} });
  });
}

test.describe('Global command bar', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
    await mockAdminApi(page);
  });

  test('shows contextual suggestions while typing on approvals', async ({ page }) => {
    await page.goto('/approvals');
    await expect(page.getByTestId('global-command-bar')).toBeVisible({ timeout: 15000 });

    const input = page.getByTestId('global-command-bar').getByRole('combobox');
    await input.click();
    await input.fill('goedkeur');

    await expect(page.getByTestId('global-command-suggestions')).toBeVisible();
    await expect(page.getByTestId('global-command-suggestions').getByRole('option').first()).toBeVisible();
  });
});
