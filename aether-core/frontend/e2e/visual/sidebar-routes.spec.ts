import { test, expect } from '@playwright/test';
import { setupVisualPage } from './setup';

const COMMAND_CENTER = '/command-center';

const sidebarClicks: { label: RegExp; path: string; testId?: string }[] = [
  { label: /Command Center/i, path: COMMAND_CENTER, testId: 'command-center-ready' },
  { label: /Vandaag/i, path: '/workstream' },
  { label: /Goedkeuringen/i, path: '/approvals', testId: 'approvals-page' },
  { label: /Inzichten/i, path: '/insights', testId: 'insights-page' },
  { label: /Activiteit/i, path: '/timeline', testId: 'activity-page' },
  { label: /Leveranciers/i, path: '/suppliers', testId: 'suppliers-page' },
  { label: /Instellingen/i, path: '/settings', testId: 'settings-page' },
];

test.describe('sidebar navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupVisualPage(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(COMMAND_CENTER);
    await expect(page.getByTestId('command-center-ready')).toBeVisible({ timeout: 15000 });
  });

  test('clicks all sidebar routes with shell intact', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    const nav = page.getByRole('navigation', { name: 'Hoofdnavigatie' });

    for (const item of sidebarClicks) {
      await nav.getByRole('link', { name: item.label }).click();
      await expect(page).toHaveURL(new RegExp(`${item.path.replace('/', '\\/')}$`));
      await expect(page.getByTestId('app-top-bar')).toBeVisible();
      await expect(page.locator('#main-content')).toBeVisible();
      if (item.testId) {
        await expect(page.getByTestId(item.testId)).toBeVisible({ timeout: 15000 });
      }
    }

    const critical = consoleErrors.filter(
      (e) => !/favicon|404.*\.png|ResizeObserver/i.test(e)
    );
    expect(critical).toEqual([]);
  });
});
