import { describe, expect, it } from 'vitest';
import {
  buildDemoResponse,
  detectIntent,
  filterSuggestions,
  getIdleSuggestions,
  getLoadingPhases,
  groupSuggestionsByCategory,
  intentToLinkedInsight,
  shouldShowIntentPill,
} from './localIntentMatcher';

describe('detectIntent', () => {
  it('detects pricing optimization', () => {
    const match = detectIntent('Optimaliseer mijn prijzen deze week');
    expect(match.id).toBe('PRICING_OPTIMIZATION');
    expect(match.confidence).toBeGreaterThanOrEqual(0.75);
  });

  it('detects product price proposal before generic pricing', () => {
    const match = detectIntent('Maak een prijsvoorstel voor Wireless Earbuds Pro');
    expect(match.id).toBe('PRODUCT_PRICE_PROPOSAL');
    expect(match.confidence).toBeGreaterThanOrEqual(0.75);
  });

  it('detects supplier check', () => {
    const match = detectIntent('Check leveranciers op prijsdalingen');
    expect(match.id).toBe('SUPPLIER_CHECK');
  });

  it('detects high-risk approvals', () => {
    const match = detectIntent('Toon high-risk goedkeuringen');
    expect(match.id).toBe('HIGH_RISK_APPROVALS');
  });

  it('detects insights overview', () => {
    const match = detectIntent('Wat staat vandaag klaar voor mij?');
    expect(match.id).toBe('INSIGHTS_OVERVIEW');
  });

  it('detects margin insight', () => {
    const match = detectIntent('Toon marge per categorie');
    expect(match.id).toBe('MARGIN_INSIGHT');
    expect(match.confidence).toBeGreaterThanOrEqual(0.75);
  });

  it('detects autonomous action', () => {
    const match = detectIntent('Voer low-risk prijsaanpassingen automatisch uit');
    expect(match.id).toBe('AUTONOMOUS_ACTION');
    expect(match.confidence).toBeGreaterThanOrEqual(0.75);
  });

  it('detects business summary', () => {
    const match = detectIntent('Hoe presteert mijn business deze week?');
    expect(match.id).toBe('BUSINESS_SUMMARY');
    expect(match.confidence).toBeGreaterThanOrEqual(0.75);
  });

  it('detects return risk orders', () => {
    const match = detectIntent('Toon orders met hoge retourkans');
    expect(match.id).toBe('RETURN_RISK_ORDERS');
    expect(match.confidence).toBeGreaterThanOrEqual(0.75);
  });

  it('distinguishes business summary from insights overview', () => {
    expect(detectIntent('Hoe presteert mijn business deze week?').id).toBe('BUSINESS_SUMMARY');
    expect(detectIntent('Wat staat vandaag klaar voor mij?').id).toBe('INSIGHTS_OVERVIEW');
  });

  it('resolves prijsvoorstel vs optimalisatie conflict via specificity', () => {
    expect(detectIntent('Maak een prijsvoorstel voor Wireless Earbuds Pro').id).toBe(
      'PRODUCT_PRICE_PROPOSAL',
    );
    expect(detectIntent('Optimaliseer mijn prijzen deze week').id).toBe('PRICING_OPTIMIZATION');
    expect(detectIntent('optimaliseer prijs voor wireless earbuds').id).toBe(
      'PRODUCT_PRICE_PROPOSAL',
    );
  });

  it('returns unknown for gibberish', () => {
    const match = detectIntent('asdf qwerty random');
    expect(match.id).toBe('UNKNOWN');
    expect(match.confidence).toBeLessThan(0.75);
  });
});

describe('shouldShowIntentPill', () => {
  it('hides unknown low-confidence intents', () => {
    expect(shouldShowIntentPill(detectIntent('random text'))).toBe(false);
  });

  it('shows high-confidence intents', () => {
    expect(shouldShowIntentPill(detectIntent('optimaliseer prijzen'))).toBe(true);
  });
});

describe('filterSuggestions', () => {
  it('returns default suggestions when empty', () => {
    expect(filterSuggestions('')).toHaveLength(6);
  });

  it('boosts matching intent suggestions', () => {
    const suggestions = filterSuggestions('leverancier prijsdaling');
    expect(suggestions[0]?.intentId).toBe('SUPPLIER_CHECK');
  });

  it('boosts margin suggestions', () => {
    const suggestions = filterSuggestions('marge categorie');
    expect(suggestions.some((s) => s.intentId === 'MARGIN_INSIGHT')).toBe(true);
  });
});

describe('getIdleSuggestions', () => {
  it('returns 6 idle suggestions across categories', () => {
    const idle = getIdleSuggestions();
    expect(idle).toHaveLength(6);
    expect(idle.some((s) => s.id === 'margin-category')).toBe(true);
    expect(idle.some((s) => s.id === 'autonomous-pricing')).toBe(true);
    expect(idle.some((s) => s.id === 'business-week')).toBe(true);
  });
});

describe('groupSuggestionsByCategory', () => {
  it('groups suggestions by category', () => {
    const groups = groupSuggestionsByCategory(getIdleSuggestions());
    expect(groups.length).toBeGreaterThan(3);
    expect(groups.some((g) => g.category === 'prijs')).toBe(true);
    expect(groups.some((g) => g.category === 'inzicht')).toBe(true);
  });
});

describe('getLoadingPhases', () => {
  it('returns phased messages per intent', () => {
    expect(getLoadingPhases('PRICING_OPTIMIZATION')).toContain('Prijsoptimalisatie berekend…');
    expect(getLoadingPhases('PRODUCT_PRICE_PROPOSAL')).toContain('Voorstel klaar…');
    expect(getLoadingPhases('MARGIN_INSIGHT')).toContain('Inzicht klaar…');
    expect(getLoadingPhases('AUTONOMOUS_ACTION')).toContain('Autonome run klaar…');
    expect(getLoadingPhases('RETURN_RISK_ORDERS')).toContain('Risico-orders gevonden…');
    expect(getLoadingPhases('BUSINESS_SUMMARY')).toContain('Samenvatting klaar…');
  });
});

describe('buildDemoResponse', () => {
  it('links pricing intents to pricing insight', () => {
    const response = buildDemoResponse('Maak een prijsvoorstel voor Wireless Earbuds Pro');
    expect(response.linkedInsightId).toBe('pricing');
    expect(response.preparedHeadline).toBe('Prijsvoorstel klaar om te publiceren');
    expect(response.executionConfirmation).toContain('Earbuds Pro');
  });

  it('links supplier intent to supplier insight', () => {
    const response = buildDemoResponse('Check leveranciers op prijsdalingen');
    expect(response.linkedInsightId).toBe('supplier');
  });

  it('links approvals to approvals insight', () => {
    const response = buildDemoResponse('Toon high-risk goedkeuringen');
    expect(response.linkedInsightId).toBe('approvals');
    expect(response.requiresApproval).toBe(true);
  });

  it('links margin insight to margins card', () => {
    const response = buildDemoResponse('Toon marge per categorie');
    expect(response.linkedInsightId).toBe('margins');
    expect(response.executeLabel).toBe('Open Insights');
    expect(response.highlights.length).toBeGreaterThan(2);
  });

  it('links autonomous action to autonomous card', () => {
    const response = buildDemoResponse('Voer low-risk prijsaanpassingen automatisch uit');
    expect(response.linkedInsightId).toBe('autonomous');
    expect(response.executeLabel).toBe('Automatisch uitvoeren');
  });

  it('links business summary to summary card', () => {
    const response = buildDemoResponse('Hoe presteert mijn business deze week?');
    expect(response.linkedInsightId).toBe('summary');
    expect(response.executeLabel).toBe('Bekijk in Insights');
    expect(response.responseVariant).toBe('summary');
    expect(response.secondaryMetrics).toHaveLength(2);
  });

  it('links return risk orders to returns card', () => {
    const response = buildDemoResponse('Toon orders met hoge retourkans');
    expect(response.intentId).toBe('RETURN_RISK_ORDERS');
    expect(response.linkedInsightId).toBe('returns');
    expect(response.executeLabel).toBe('Bekijk orders');
    expect(response.metricValue).toBe('2');
  });
});

describe('intentToLinkedInsight', () => {
  it('maps pricing intents to pricing', () => {
    expect(intentToLinkedInsight('PRICING_OPTIMIZATION')).toBe('pricing');
    expect(intentToLinkedInsight('PRODUCT_PRICE_PROPOSAL')).toBe('pricing');
  });

  it('maps supplier and approvals intents', () => {
    expect(intentToLinkedInsight('SUPPLIER_CHECK')).toBe('supplier');
    expect(intentToLinkedInsight('HIGH_RISK_APPROVALS')).toBe('approvals');
  });

  it('maps new intents to their cards', () => {
    expect(intentToLinkedInsight('MARGIN_INSIGHT')).toBe('margins');
    expect(intentToLinkedInsight('AUTONOMOUS_ACTION')).toBe('autonomous');
    expect(intentToLinkedInsight('RETURN_RISK_ORDERS')).toBe('returns');
    expect(intentToLinkedInsight('BUSINESS_SUMMARY')).toBe('summary');
  });

  it('returns null for overview and unknown', () => {
    expect(intentToLinkedInsight('INSIGHTS_OVERVIEW')).toBeNull();
    expect(intentToLinkedInsight('UNKNOWN')).toBeNull();
  });
});
