import { describe, expect, it } from 'vitest';
import { buildDemoResponse } from './localIntentMatcher';
import {
  applyCommandComplete,
  applyExecute,
  finalizeExiting,
  getInitialTodayReadyInsights,
  subtitleForInsights,
  visibleInsightIds,
  visibleInsights,
} from './todayReady';

describe('getInitialTodayReadyInsights', () => {
  it('starts with pricing and approvals visible, supplier hidden', () => {
    const insights = getInitialTodayReadyInsights();
    expect(visibleInsightIds(insights)).toEqual(['pricing', 'approvals']);
    expect(insights.find((i) => i.id === 'supplier')?.visible).toBe(false);
  });
});

describe('applyCommandComplete', () => {
  it('updates pricing card and promotes to front on PRICING_OPTIMIZATION', () => {
    const initial = getInitialTodayReadyInsights();
    const response = buildDemoResponse('Optimaliseer mijn prijzen deze week');
    const next = applyCommandComplete(initial, response);

    const pricing = next.find((i) => i.id === 'pricing')!;
    expect(pricing.title).toBe('3 SKU · klaar');
    expect(pricing.confidence?.value).toBe('87%');
    expect(visibleInsightIds(next)[0]).toBe('pricing');
    expect(pricing.updatedAt).toBeDefined();
  });

  it('updates pricing to product variant on PRODUCT_PRICE_PROPOSAL', () => {
    const initial = getInitialTodayReadyInsights();
    const response = buildDemoResponse('Maak een prijsvoorstel voor Wireless Earbuds Pro');
    const next = applyCommandComplete(initial, response);

    const pricing = next.find((i) => i.id === 'pricing')!;
    expect(pricing.title).toBe('Earbuds Pro · +4,2%');
    expect(pricing.confidence?.value).toBe('91%');
    expect(pricing.metric?.value).toBe('+€420');
  });

  it('reveals supplier card on SUPPLIER_CHECK', () => {
    const initial = getInitialTodayReadyInsights();
    const response = buildDemoResponse('Check leveranciers op prijsdalingen');
    const next = applyCommandComplete(initial, response);

    const supplier = next.find((i) => i.id === 'supplier')!;
    expect(supplier.visible).toBe(true);
    expect(supplier.justAppeared).toBe(true);
    expect(visibleInsightIds(next)[0]).toBe('supplier');
    expect(supplier.title).toBe(`Nordic · inkoop ${response.impactValue}`);
    expect(supplier.chips).toContain('4 producten');
  });

  it('updates approvals and promotes on HIGH_RISK_APPROVALS', () => {
    const initial = getInitialTodayReadyInsights();
    const response = buildDemoResponse('Toon high-risk goedkeuringen');
    const next = applyCommandComplete(initial, response);

    const approvals = next.find((i) => i.id === 'approvals')!;
    expect(approvals.title).toBe('4 high-risk');
    expect(visibleInsightIds(next)[0]).toBe('approvals');
    expect(approvals.listItems?.length).toBeGreaterThan(0);
  });

  it('reveals all cards on INSIGHTS_OVERVIEW', () => {
    const initial = getInitialTodayReadyInsights();
    const response = buildDemoResponse('Wat staat vandaag klaar voor mij?');
    const next = applyCommandComplete(initial, response);

    expect(visibleInsightIds(next)).toEqual(['pricing', 'supplier', 'approvals']);
    expect(next.find((i) => i.id === 'supplier')?.justAppeared).toBe(true);
  });

  it('does not mutate on UNKNOWN', () => {
    const initial = getInitialTodayReadyInsights();
    const response = buildDemoResponse('random gibberish xyz');
    const next = applyCommandComplete(initial, response);
    expect(visibleInsightIds(next)).toEqual(visibleInsightIds(initial));
  });

  it('reveals margins card on MARGIN_INSIGHT', () => {
    const initial = getInitialTodayReadyInsights();
    const response = buildDemoResponse('Toon marge per categorie');
    const next = applyCommandComplete(initial, response);

    const margins = next.find((i) => i.id === 'margins')!;
    expect(margins.visible).toBe(true);
    expect(margins.justAppeared).toBe(true);
    expect(visibleInsightIds(next)[0]).toBe('margins');
    expect(margins.listItems?.length).toBeGreaterThan(0);
  });

  it('reveals autonomous and updates pricing on AUTONOMOUS_ACTION', () => {
    const initial = getInitialTodayReadyInsights();
    const response = buildDemoResponse('Voer low-risk prijsaanpassingen automatisch uit');
    const next = applyCommandComplete(initial, response);

    const autonomous = next.find((i) => i.id === 'autonomous')!;
    const pricing = next.find((i) => i.id === 'pricing')!;
    expect(autonomous.visible).toBe(true);
    expect(autonomous.justAppeared).toBe(true);
    expect(pricing.title).toBe('3 SKU · autonoom klaar');
    expect(visibleInsightIds(next)[0]).toBe('autonomous');
  });

  it('reveals summary on BUSINESS_SUMMARY', () => {
    const initial = getInitialTodayReadyInsights();
    const response = buildDemoResponse('Hoe presteert mijn business deze week?');
    const next = applyCommandComplete(initial, response);

    const summary = next.find((i) => i.id === 'summary')!;
    expect(summary.visible).toBe(true);
    expect(summary.justAppeared).toBe(true);
    expect(summary.chips?.length).toBeGreaterThan(0);
    expect(visibleInsightIds(next)[0]).toBe('summary');
  });
});

describe('applyExecute', () => {
  it('marks pricing as exiting on execute', () => {
    const initial = getInitialTodayReadyInsights();
    const after = applyExecute(initial, 'PRICING_OPTIMIZATION');
    const pricing = after.find((i) => i.id === 'pricing')!;
    expect(pricing.executed).toBe(true);
    expect(pricing.exiting).toBe(true);
  });

  it('demotes supplier without exiting on execute', () => {
    let insights = getInitialTodayReadyInsights();
    insights = applyCommandComplete(
      insights,
      buildDemoResponse('Check leveranciers op prijsdalingen'),
    );
    const after = applyExecute(insights, 'SUPPLIER_CHECK');
    const supplier = after.find((i) => i.id === 'supplier')!;
    expect(supplier.executed).toBe(true);
    expect(supplier.exiting).toBeFalsy();
    expect(supplier.sortOrder).toBeGreaterThan(0);
  });

  it('marks approvals as exiting on execute', () => {
    const initial = getInitialTodayReadyInsights();
    const after = applyExecute(initial, 'HIGH_RISK_APPROVALS');
    const approvals = after.find((i) => i.id === 'approvals')!;
    expect(approvals.executed).toBe(true);
    expect(approvals.exiting).toBe(true);
  });

  it('archives pricing and keeps autonomous on AUTONOMOUS_ACTION execute', () => {
    let insights = getInitialTodayReadyInsights();
    insights = applyCommandComplete(
      insights,
      buildDemoResponse('Voer low-risk prijsaanpassingen automatisch uit'),
    );
    const after = applyExecute(insights, 'AUTONOMOUS_ACTION');
    expect(after.find((i) => i.id === 'pricing')?.exiting).toBe(true);
    expect(after.find((i) => i.id === 'autonomous')?.executed).toBe(true);
    expect(after.find((i) => i.id === 'autonomous')?.exiting).toBeFalsy();
  });

  it('demotes margins on execute', () => {
    let insights = getInitialTodayReadyInsights();
    insights = applyCommandComplete(insights, buildDemoResponse('Toon marge per categorie'));
    const after = applyExecute(insights, 'MARGIN_INSIGHT');
    const margins = after.find((i) => i.id === 'margins')!;
    expect(margins.executed).toBe(true);
    expect(margins.exiting).toBeFalsy();
    expect(margins.sortOrder).toBeGreaterThan(0);
  });

  it('demotes summary on execute', () => {
    let insights = getInitialTodayReadyInsights();
    insights = applyCommandComplete(
      insights,
      buildDemoResponse('Hoe presteert mijn business deze week?'),
    );
    const after = applyExecute(insights, 'BUSINESS_SUMMARY');
    const summary = after.find((i) => i.id === 'summary')!;
    expect(summary.executed).toBe(true);
    expect(summary.exiting).toBeFalsy();
    expect(summary.sortOrder).toBeGreaterThan(0);
  });

  it('demotes returns on execute', () => {
    let insights = getInitialTodayReadyInsights();
    insights = applyCommandComplete(insights, buildDemoResponse('Toon orders met hoge retourkans'));
    const after = applyExecute(insights, 'RETURN_RISK_ORDERS');
    const returns = after.find((i) => i.id === 'returns')!;
    expect(returns.executed).toBe(true);
    expect(returns.exiting).toBeFalsy();
    expect(returns.sortOrder).toBeGreaterThan(0);
  });

  it('refreshes sibling cards on BUSINESS_SUMMARY', () => {
    const initial = getInitialTodayReadyInsights();
    const response = buildDemoResponse('Hoe presteert mijn business deze week?');
    const next = applyCommandComplete(initial, response);
    const pricing = next.find((i) => i.id === 'pricing')!;
    expect(pricing.metric?.subValue).toBe('· week actueel');
    expect(pricing.updatedAt).toBeDefined();
  });
});

describe('finalizeExiting', () => {
  it('removes exiting cards from visible list', () => {
    let insights = getInitialTodayReadyInsights();
    insights = applyExecute(insights, 'PRICING_OPTIMIZATION');
    const finalized = finalizeExiting(insights);
    expect(visibleInsights(finalized).some((i) => i.id === 'pricing')).toBe(false);
    expect(finalized.some((i) => i.id === 'pricing')).toBe(false);
  });
});

describe('subtitleForInsights', () => {
  it('returns dynamic count', () => {
    const initial = getInitialTodayReadyInsights();
    expect(subtitleForInsights(initial)).toContain('2 acties');
  });

  it('counts exiting cards until removed', () => {
    let insights = getInitialTodayReadyInsights();
    insights = applyExecute(insights, 'PRICING_OPTIMIZATION');
    expect(subtitleForInsights(insights)).toContain('2 acties');
  });

  it('returns empty message when no visible cards', () => {
    let insights = getInitialTodayReadyInsights();
    insights = applyExecute(insights, 'PRICING_OPTIMIZATION');
    insights = applyExecute(insights, 'HIGH_RISK_APPROVALS');
    insights = finalizeExiting(insights);
    expect(subtitleForInsights(insights)).toContain('Alles afgehandeld');
  });
});
