import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from '../shared/auth';
import { clickHeroSuggestion, COMMAND_SUGGESTION_LABELS, gotoCommandCenter } from './command-helpers';
import {
  mockActivityFeed,
  mockApprovalsPending,
  mockConnectedServices,
  mockDashboard,
  mockMerchantSettings,
  mockPolicy,
  mockSupplierOverview,
} from './fixtures';

let settingsState = structuredClone(mockMerchantSettings.settings);

function resetSettingsState() {
  settingsState = structuredClone(mockMerchantSettings.settings);
}

async function mockAdminApi(page: import('@playwright/test').Page) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/api/admin/dashboard') || url.includes('/api/admin/events/stream')) {
      await route.fulfill({ json: mockDashboard });
      return;
    }
    if (url.includes('/api/admin/policies/approval')) {
      await route.fulfill({ json: mockPolicy });
      return;
    }
    if (url.includes('/api/admin/settings') && method === 'GET') {
      await route.fulfill({ json: { status: 'live', settings: settingsState } });
      return;
    }
    if (url.includes('/api/admin/settings') && method === 'PUT') {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      settingsState = { ...settingsState, ...body };
      await route.fulfill({ json: { success: true, settings: settingsState } });
      return;
    }
    if (url.includes('/api/admin/connected-services')) {
      await route.fulfill({ json: mockConnectedServices });
      return;
    }
    if (url.includes('/api/admin/operating-metrics')) {
      await route.fulfill({
        json: {
          tenantSafetyScore: 0.92,
          gatePassRate: 0.88,
          autonomyRate: 0.71,
          autonomyIncidentRate: 0.02,
          causalUpliftVerified: 1240,
          rollbackSuccessRate: 1,
          killFastCandidates: [],
          truthReviewDue: false,
          lastTruthReviewAt: new Date().toISOString(),
        },
      });
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
    if (url.includes('/api/admin/activity')) {
      await route.fulfill({ json: mockActivityFeed });
      return;
    }
    if (url.includes('/api/suppliers/overview')) {
      await route.fulfill({ json: mockSupplierOverview });
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

test.describe('Settings smoke', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
    resetSettingsState();
    await mockAdminApi(page);
    await page.addInitScript(() => {
      localStorage.removeItem('aether_proactive_suggestions');
    });
  });

  test('settings page sections render', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByTestId('settings-page')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('settings-autonomy')).toBeVisible();
    await page.getByTestId('settings-nav-notifications').locator('visible=true').click();
    await expect(page.getByTestId('settings-notifications')).toBeVisible();
  });

  test('disabling auto low-risk requires approval on pricing command', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByTestId('auto-low-risk')).toBeVisible({ timeout: 15000 });

    await page.getByTestId('auto-low-risk').click();
    await page.getByRole('button', { name: 'Opslaan' }).click();

    await page.goto('/command-center');
    await expect(page.getByTestId('command-center-ready')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('home-welcome-header')).toBeVisible();
  });

  test('command demo response reflects auto low-risk off', async ({ page }) => {
    settingsState = {
      ...structuredClone(mockMerchantSettings.settings),
      autoApproveLowRisk: false,
    };

    await gotoCommandCenter(page);
    await clickHeroSuggestion(page, COMMAND_SUGGESTION_LABELS.pricingWeek);
    await expect(page.getByTestId('command-demo-response')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('command-demo-response')).toHaveAttribute(
      'data-execution-mode',
      'approval_required'
    );
    await expect(
      page.getByTestId('command-demo-response').getByText('Goedkeuring vereist')
    ).toBeVisible();
  });
});
