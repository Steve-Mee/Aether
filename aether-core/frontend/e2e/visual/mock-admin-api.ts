import type { Page, Route } from '@playwright/test';
import {
  mockActivityFeed,
  mockConnectedServices,
  mockDashboard,
  mockMerchantSettings,
  mockSupplierOverview,
  mockTruthStatus,
} from './fixtures';
import {
  executePlaywrightCommand,
  getPlaywrightActivityFeed,
  getPlaywrightApprovals,
  getPlaywrightAutonomyMetrics,
  getPlaywrightSupplierOverview,
  getPlaywrightSupplierDetail,
  monitorPlaywrightSupplier,
  resetPlaywrightApiState,
  resolvePlaywrightApproval,
  undoPlaywrightCommand,
} from '../shared/playwrightApiState';

export async function setupMockAdminApi(page: Page) {
  resetPlaywrightApiState();

  await page.route('**/api/**', async (route: Route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (/\/api\/admin\/command\/[^/]+\/undo/.test(url) && method === 'POST') {
      const match = url.match(/\/api\/admin\/command\/([^/]+)\/undo/);
      const commandId = match?.[1] ?? 'unknown';
      await route.fulfill({ json: undoPlaywrightCommand(commandId) });
      return;
    }

    if (url.includes('/api/admin/command') && method === 'POST') {
      try {
        const body = route.request().postDataJSON() as { command?: string };
        await route.fulfill({
          json: executePlaywrightCommand(body?.command ?? ''),
        });
      } catch (e) {
        await route.fulfill({
          status: 500,
          json: { error: e instanceof Error ? e.message : 'Command failed' },
        });
      }
      return;
    }

    if (/\/api\/approvals\/[^/]+\/resolve/.test(url) && method === 'POST') {
      try {
        const match = url.match(/\/api\/approvals\/([^/]+)\/resolve/);
        const id = match?.[1];
        if (id) resolvePlaywrightApproval(id);
        await route.fulfill({ json: { success: true } });
      } catch (e) {
        await route.fulfill({
          status: 500,
          json: { error: e instanceof Error ? e.message : 'Resolve failed' },
        });
      }
      return;
    }

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
      await route.fulfill({ json: mockTruthStatus });
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
      await route.fulfill({ json: getPlaywrightActivityFeed() });
      return;
    }
    if (url.includes('/api/admin/notifications')) {
      await route.fulfill({ json: { notifications: [] } });
      return;
    }
    if (url.includes('/api/suppliers/overview')) {
      await route.fulfill({ json: getPlaywrightSupplierOverview() });
      return;
    }
    if (url.includes('/api/suppliers/changes')) {
      await route.fulfill({ json: [] });
      return;
    }
    if (
      /\/api\/suppliers\/[^/]+$/.test(url) &&
      method === 'GET' &&
      !url.includes('overview') &&
      !url.includes('changes')
    ) {
      const match = url.match(/\/api\/suppliers\/([^/]+)$/);
      const id = match?.[1] ?? 'unknown';
      await route.fulfill({ json: getPlaywrightSupplierDetail(id) });
      return;
    }
    if (/\/api\/suppliers\/[^/]+\/monitor/.test(url) && method === 'POST') {
      const match = url.match(/\/api\/suppliers\/([^/]+)\/monitor/);
      const id = match?.[1] ?? 'unknown';
      await route.fulfill({ json: monitorPlaywrightSupplier(id) });
      return;
    }
    if (url.includes('/api/admin/autonomy')) {
      await route.fulfill({ json: getPlaywrightAutonomyMetrics() });
      return;
    }
    if (url.includes('/api/outcomes/report')) {
      await route.fulfill({
        json: {
          periodDays: 30,
          totalRecords: 2,
          verifiedCount: 2,
          billableCount: 1,
          totalBillableUplift: 500,
          records: [],
        },
      });
      return;
    }
    if (url.includes('/api/approvals') && method === 'GET') {
      await route.fulfill({ json: getPlaywrightApprovals() });
      return;
    }
    if (url.includes('/api/approvals/auto-apply') && method === 'POST') {
      await route.fulfill({ json: { applied: 0, skipped: 0, skippedIds: [] } });
      return;
    }
    if (url.includes('/api/admin/suggestions')) {
      await route.fulfill({
        json: {
          nowRelevant: [],
          groups: [],
          suggestions: [],
        },
      });
      return;
    }
    if (url.includes('/api/emails') || url.includes('/api/autonomous')) {
      await route.fulfill({ json: [] });
      return;
    }
    await route.fulfill({ status: 200, json: {} });
  });
}
