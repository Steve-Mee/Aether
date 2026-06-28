import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from '../shared/auth';

async function mockSuppliersApi(page: import('@playwright/test').Page) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/api/suppliers/overview')) {
      await route.fulfill({
        json: {
          stats: {
            totalMonitored: 2,
            activeAutoSyncs: 1,
            syncsCompletedThisMonth: 5,
            priceDropsThisMonth: 1,
            autonomousPriceAdjustments: 0,
          },
          suppliers: [
            {
              id: 'sup_e2e_1',
              name: 'Nordic E2E Supply',
              website: 'https://nordic-e2e.example',
              supplierType: 'wholesale',
              status: 'active',
              autoSyncEnabled: true,
              productCount: 12,
              lastSyncAt: new Date().toISOString(),
              lastAutoSyncAt: new Date().toISOString(),
              recentChangeCount: 2,
              hasRecentPriceDrop: true,
              hasRecentStockChange: false,
              hasRecentImportantChange: true,
              monitoringLabel: 'sync_on',
            },
          ],
        },
      });
      return;
    }
    if (url.match(/\/api\/suppliers\/[^/]+$/) && !url.includes('overview')) {
      await route.fulfill({
        json: {
          id: 'sup_e2e_1',
          name: 'Nordic E2E Supply',
          website: 'https://nordic-e2e.example',
          supplierType: 'wholesale',
          status: 'active',
          autoSyncEnabled: true,
          productCount: 12,
          lastSyncAt: new Date().toISOString(),
          lastAutoSyncAt: new Date().toISOString(),
          recentChanges: [
            {
              id: 'ch1',
              changeType: 'price_change',
              payload: { sku: 'X-1', oldPrice: 10, newPrice: 8 },
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
          ],
          recentProducts: [
            {
              id: 'p1',
              sku: 'X-1',
              name: 'Test Product',
              currentPrice: 8,
              stock: 5,
              lastUpdated: new Date().toISOString(),
            },
          ],
          recentSyncs: [
            {
              id: 'sync1',
              at: new Date().toISOString(),
              source: 'monitor',
              actor: 'merchant',
              label: 'monitor',
              productsFound: 12,
              changeCount: 2,
            },
          ],
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
          features: { 'supplier-intelligence': { status: 'live' } },
          phases: {},
        },
      });
      return;
    }
    if (url.includes('/api/admin/dashboard') || url.includes('/api/admin/events/stream')) {
      await route.fulfill({
        json: {
          status: 'partial',
          productCount: 0,
          pendingApprovals: 0,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
    if (url.includes('/api/admin/settings')) {
      await route.fulfill({
        json: {
          status: 'live',
          settings: {
            autonomyLevel: 'medium',
            notificationPrefs: {
              autonomousLowRisk: { inApp: true, email: false },
              highRiskApproval: { inApp: true, email: true },
              supplierChanges: { inApp: true, email: false },
              weeklyDigest: { inApp: true, email: true },
              frequency: 'immediate',
            },
            locale: 'nl',
          },
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

test.describe('Suppliers page /suppliers', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await mockSuppliersApi(page);
    await page.goto('/suppliers');
    await page.waitForLoadState('networkidle');
  });

  test('renders header, metrics, and supplier card', async ({ page }) => {
    await expect(page.getByTestId('suppliers-page')).toBeVisible();
    await expect(page.getByTestId('suppliers-metrics')).toBeVisible();
    await expect(page.getByTestId('supplier-card-sup_e2e_1')).toBeVisible();
    await expect(page.getByText('Syncs deze maand')).toBeVisible();
  });

  test('opens detail sheet with sync history', async ({ page }) => {
    await page.getByTestId('supplier-card-sup_e2e_1').getByRole('button').click();
    await expect(page.getByTestId('supplier-detail-sheet')).toBeVisible();
    await expect(page.getByTestId('supplier-recent-syncs')).toBeVisible();
  });
});
