import { expect, type Page } from '@playwright/test';

/** Match hero chips — contextual labels override static idle copy when dashboard/today-ready signals exist. */
export const COMMAND_SUGGESTION_LABELS = {
  pricingWeek: /Publiceer prijsactie|Optimaliseer prijzen|lage-marge SKU/i,
  supplierDrops: /Check leveranciers|Sync Nordic/i,
  marginCategory: /Toon marge per categorie/i,
  highRisk: /high-risk|Toon high-risk|Behandel \d+ goedkeuring/i,
  autonomousPricing: /Voer low-risk prijsaanpassingen/i,
  businessWeek: /Hoe presteert mijn business/i,
  todayReady: /Wat staat vandaag klaar/i,
  compoundEarbudsNordic: /Prijzen \+ Nordic|Wireless Earbuds en sync/i,
} as const;

/** Direct NL commands when contextual suggestions are not pinned in the hero panel. */
export const HERO_COMMANDS = {
  supplier: 'Check leveranciers op prijsdalingen',
  highRisk: 'Toon high-risk goedkeuringen',
  autonomous: 'Voer low-risk prijsaanpassingen autonoom uit',
  todayReady: 'Wat staat vandaag klaar voor mij?',
  pricingWeek: 'Optimaliseer mijn prijzen deze week',
} as const;

export const COMMAND_CENTER_PATH = '/command-center';

export async function gotoCommandCenter(page: Page) {
  await page.goto(COMMAND_CENTER_PATH);
  await expect(page.getByTestId('command-center-ready')).toBeVisible({ timeout: 15000 });
}

/** Hero command input inside Command Center (not the global shell bar). */
export function heroCommandInput(page: Page) {
  return page.getByTestId('command-center-ready').getByRole('combobox').first();
}

export async function clickHeroSuggestion(page: Page, label: string | RegExp) {
  const input = heroCommandInput(page);
  await input.click();
  const panel = page.locator('#command-suggestions');
  await expect(panel).toBeVisible({ timeout: 15000 });
  const target = panel.getByRole('option', { name: label }).first();
  await expect(target).toBeVisible({ timeout: 15000 });
  await target.scrollIntoViewIfNeeded();
  await target.click();
}

export async function runHeroCommand(page: Page, command: string) {
  await gotoCommandCenter(page);
  const input = heroCommandInput(page);
  await input.fill(command);
  await input.press('Enter');
}
