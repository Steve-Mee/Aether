import { test, expect } from '@playwright/test';
import { mockApprovalsPending } from './fixtures';
import { setupVisualPage } from './setup';
import {
  clickHeroSuggestion,
  COMMAND_SUGGESTION_LABELS,
  HERO_COMMANDS,
  gotoCommandCenter,
  runHeroCommand,
} from './command-helpers';

test.describe('Admin UI visual smoke', () => {
  test.beforeEach(async ({ page }) => {
    await setupVisualPage(page);
    await page.addInitScript(() => {
      localStorage.removeItem('aether_proactive_suggestions');
    });
  });

  test('command center home landing', async ({ page }) => {
    await gotoCommandCenter(page);
    await expect(page.getByTestId('home-welcome-header')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Goedemorgen|Goedemiddag|Goedenavond|Welkom terug/)).toBeVisible();
    await expect(page.getByTestId('home-outcome-metrics')).toBeVisible();
    await expect(page.getByTestId('home-today-summary')).toBeVisible();
    await expect(page.getByTestId('home-quick-actions')).toBeVisible();
    await expect(page.getByTestId('home-activity-preview')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-highlighted]')).toHaveCount(0);
    await expect(page.getByTestId('today-ready-section')).toHaveCount(0);
    await expect(page).toHaveScreenshot('command-center.png');
  });

  test('command bar supplier check reveals supplier card', async ({ page }) => {
    await runHeroCommand(page, HERO_COMMANDS.supplier);

    await expect(page.getByTestId('command-demo-response')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('today-ready-section')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-highlighted="supplier"]')).toBeVisible();
  });

  test('command bar pricing updates insight card content', async ({ page }) => {
    await gotoCommandCenter(page);
    await clickHeroSuggestion(page, COMMAND_SUGGESTION_LABELS.pricingWeek);
    await expect(page.getByTestId('command-demo-response')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: '3 SKU · klaar' })).toBeVisible();
    await expect(page.locator('[data-highlighted="pricing"]')).toBeVisible();
  });

  test('command bar execute archives pricing insight card', async ({ page }) => {
    await gotoCommandCenter(page);
    await clickHeroSuggestion(page, COMMAND_SUGGESTION_LABELS.pricingWeek);
    await expect(page.getByTestId('command-demo-response')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: '3 SKU · klaar' })).toBeVisible();

    await page
      .getByTestId('command-demo-response')
      .getByRole('button', { name: 'Automatisch uitvoeren' })
      .click();

    await expect(
      page.locator('[data-highlighted="pricing"]').getByText('Uitgevoerd', { exact: true })
    ).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page.getByRole('heading', { name: '3 SKU · klaar' })).toHaveCount(0);
    await expect(page.getByTestId('today-ready-section')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Eén actie klaar|Alles afgehandeld voor vandaag/ })
    ).toBeVisible();
  });

  test('command bar demo flow highlights approvals card', async ({ page }) => {
    await runHeroCommand(page, HERO_COMMANDS.highRisk);

    await expect(page.getByTestId('command-demo-response')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-highlighted="approvals"]')).toBeVisible();
  });

  test('command bar dismiss clears response and highlight', async ({ page }) => {
    await runHeroCommand(page, HERO_COMMANDS.highRisk);
    await expect(page.getByTestId('command-demo-response')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-highlighted="approvals"]')).toBeVisible();

    await page.getByRole('button', { name: 'Weigeren' }).click();

    await expect(page.getByTestId('command-demo-response')).toBeHidden();
    await expect(page.locator('[data-highlighted="approvals"]')).toHaveCount(0);
  });

  test('hero auto-execute runs autonomous batch', async ({ page }) => {
    await runHeroCommand(page, HERO_COMMANDS.autonomous);
    const response = page.getByTestId('command-demo-response');
    await expect(response).toBeVisible({ timeout: 10000 });
    await response.getByRole('button', { name: 'Automatisch uitvoeren' }).click();
    await expect(page.locator('[data-highlighted="autonomous"]')).toBeVisible({ timeout: 10000 });
    await expect(
      response.getByText(/Autonome prijsrun|Autonome prijsbatch|low-risk batch/i)
    ).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="command-center-ready"]')).toHaveAttribute(
      'data-executed-intent',
      'AUTONOMOUS_ACTION',
      { timeout: 10000 }
    );
  });

  test('high-risk approval gate confirms execution', async ({ page }) => {
    await runHeroCommand(page, HERO_COMMANDS.highRisk);
    await expect(page.getByTestId('command-demo-response')).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByTestId('command-demo-response').getByText('Goedkeuring vereist')
    ).toBeVisible();

    await page
      .getByTestId('command-demo-response')
      .getByRole('button', { name: 'Goedkeuring nodig' })
      .click();
    await expect(page.getByTestId('command-approval-sheet')).toBeVisible();

    await page.getByRole('button', { name: 'Goedkeuren & uitvoeren' }).click();
    await expect(page.getByText('4 goedkeuringen verwerkt')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="command-center-ready"]')).toHaveAttribute(
      'data-executed-intent',
      'HIGH_RISK_APPROVALS',
      { timeout: 10000 }
    );
    await page.waitForTimeout(500);
    await expect(
      page.getByRole('heading', { name: /Eén actie klaar|Alles afgehandeld voor vandaag/ })
    ).toBeVisible();
  });

  test('approval sheet adjust focuses command bar with original command', async ({ page }) => {
    await gotoCommandCenter(page);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('command-center-ready')).toBeVisible({ timeout: 20000 });
    await runHeroCommand(page, HERO_COMMANDS.highRisk);
    await expect(page.getByTestId('command-demo-response')).toBeVisible({ timeout: 10000 });
    await page
      .getByTestId('command-demo-response')
      .getByRole('button', { name: 'Goedkeuring nodig' })
      .click();
    await expect(page.getByTestId('command-approval-sheet')).toBeVisible();

    await page.getByTestId('command-approval-sheet').getByRole('button', { name: 'Aanpassen' }).click();
    await expect(page.getByTestId('command-approval-sheet')).toBeHidden();
    await expect(page.getByTestId('command-demo-response')).toBeHidden();

    const input = page.getByRole('textbox', { name: /Zeg wat je wilt/ });
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('Toon high-risk goedkeuringen');
  });

  test('command bar retrigger highlight on repeated command', async ({ page }) => {
    await runHeroCommand(page, HERO_COMMANDS.highRisk);
    await expect(page.locator('[data-highlighted="approvals"]')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(5500);
    await expect(page.locator('[data-highlighted="approvals"]')).toHaveCount(0);

    const input = page.getByRole('textbox').first();
    await input.fill(HERO_COMMANDS.highRisk);
    await input.press('Enter');
    await expect(page.locator('[data-highlighted="approvals"]')).toBeVisible({ timeout: 10000 });
  });

  test('command bar overview stagger highlights each card', async ({ page }) => {
    await runHeroCommand(page, HERO_COMMANDS.todayReady);
    await expect(page.getByTestId('command-demo-response')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('today-ready-section')).toBeVisible({ timeout: 10000 });

    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      for (const id of ['pricing', 'supplier', 'approvals']) {
        if (await page.locator(`[data-highlighted="${id}"]`).isVisible()) {
          seen.add(id);
        }
      }
      await page.waitForTimeout(100);
    }

    expect(seen.has('pricing')).toBe(true);
    expect(seen.has('supplier')).toBe(true);
    expect(seen.has('approvals')).toBe(true);
  });

  test('command bar margin insight reveals margins card', async ({ page }) => {
    await gotoCommandCenter(page);
    await clickHeroSuggestion(page, COMMAND_SUGGESTION_LABELS.marginCategory);

    await expect(page.getByTestId('command-demo-response')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-highlighted="margins"]')).toBeVisible();
    await expect(page.locator('[data-highlighted="margins"]').getByText('Marge per categorie')).toBeVisible();
  });

  test('command bar autonomous action reveals autonomous card', async ({ page }) => {
    await runHeroCommand(page, HERO_COMMANDS.autonomous);
    await expect(page.getByTestId('command-demo-response')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-highlighted="autonomous"]')).toBeVisible();
    await expect(page.getByText('3 SKU · low-risk batch')).toBeVisible();
  });

  test('command bar business summary reveals summary card', async ({ page }) => {
    await gotoCommandCenter(page);
    await clickHeroSuggestion(page, COMMAND_SUGGESTION_LABELS.businessWeek);
    await expect(page.getByTestId('command-demo-response')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-highlighted="summary"]')).toBeVisible();
    await expect(page.getByText('Sterke week · +12%')).toBeVisible();
    const response = page.getByTestId('command-demo-response');
    await expect(response.getByText('312', { exact: true })).toBeVisible();
  });

  test('command bar suggestions panel when typing', async ({ page }) => {
    await gotoCommandCenter(page);
    const input = page.getByRole('textbox').first();
    await input.click();
    await input.fill('prijs');
    await expect(page.locator('#command-suggestions [role="option"]').first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('Nu relevant').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('command-center-suggestions-open.png');
  });

  test('command bar compound workflow shows step rail', async ({ page }) => {
    await gotoCommandCenter(page);
    const input = page.getByRole('textbox').first();
    await input.fill('Optimaliseer prijzen voor Wireless Earbuds en sync Nordic');
    await input.press('Enter');
    await expect(page.getByTestId('compound-step-rail')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('command-demo-response')).toBeVisible({ timeout: 15000 });
  });

  test('command bar undo after execute', async ({ page }) => {
    await gotoCommandCenter(page);
    await clickHeroSuggestion(page, COMMAND_SUGGESTION_LABELS.pricingWeek);
    await expect(page.getByTestId('command-demo-response')).toBeVisible({ timeout: 10000 });
    await page
      .getByTestId('command-demo-response')
      .getByRole('button', { name: 'Automatisch uitvoeren' })
      .click();
    await expect(page.getByTestId('command-execute-confirmation')).toBeVisible();
    await page.getByTestId('command-undo-button').click();
    await expect(page.getByText('Teruggedraaid (demo)')).toBeVisible();
  });

  test('workstream', async ({ page }) => {
    await page.goto('/workstream');
    await expect(page.locator('h1')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('workstream.png');
  });

  test('insights', async ({ page }) => {
    await page.route('**/api/outcomes/report**', async (route) => {
      await route.fulfill({
        json: {
          periodDays: 30,
          totalRecords: 2,
          verifiedCount: 2,
          billableCount: 2,
          totalBillableUplift: 4200,
          records: [
            {
              id: 'o1',
              metric: 'Outdoor',
              baseline: 1000,
              observed: 1200,
              uplift: 200,
              confidence: 0.9,
              verificationStatus: 'verified',
              periodStart: '2026-01-01',
              periodEnd: '2026-01-31',
            },
          ],
        },
      });
    });
    await page.route('**/api/admin/autonomy**', async (route) => {
      await route.fulfill({
        json: {
          totalDecisions: 50,
          autonomousDecisions: 42,
          humanGatedDecisions: 8,
          autonomyRate: 0.84,
          targetMet: true,
        },
      });
    });
    await page.goto('/insights');
    await expect(page.getByTestId('insights-page')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('insights-metrics-grid')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('insights.png');
  });

  test('approvals', async ({ page }) => {
    await page.route(/\/api\/approvals\/?$/, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({ json: mockApprovalsPending });
    });
    await page.goto('/approvals');
    await expect(page.getByTestId('approvals-page')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('approvals-toolbar')).toBeVisible();
    await expect(page.getByTestId('approval-card-approval-refund-1')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('approvals.png');
  });
});
