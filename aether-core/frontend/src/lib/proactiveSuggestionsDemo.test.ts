import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDemoResponse } from './localIntentMatcher';
import {
  applyCommandComplete,
  getInitialTodayReadyInsights,
  visibleInsightIds,
} from './todayReady';
import {
  PROACTIVE_SUGGESTIONS,
  dismissSuggestion,
  getProactiveSuggestions,
  resetProactiveSuggestionState,
  snoozeSuggestion,
} from './proactiveSuggestionsDemo';

function mockLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  });
}

describe('PROACTIVE_SUGGESTIONS', () => {
  it('defines five demo suggestions with execution modes', () => {
    expect(PROACTIVE_SUGGESTIONS).toHaveLength(5);
    expect(PROACTIVE_SUGGESTIONS.map((s) => s.id)).toEqual([
      'proactive-autonomous-pricing',
      'proactive-bulk-price-approval',
      'proactive-supplier-nordic',
      'proactive-return-risk',
      'proactive-margin-audio',
    ]);
    const bulk = PROACTIVE_SUGGESTIONS.find((s) => s.id === 'proactive-bulk-price-approval');
    expect(bulk?.executionMode).toBe('approval_required');
    const auto = PROACTIVE_SUGGESTIONS.find((s) => s.id === 'proactive-autonomous-pricing');
    expect(auto?.executionMode).toBe('autonomous');
  });
});

describe('getProactiveSuggestions', () => {
  beforeEach(() => {
    mockLocalStorage();
    resetProactiveSuggestionState();
  });

  it('returns all suggestions initially', () => {
    expect(getProactiveSuggestions()).toHaveLength(5);
  });

  it('filters dismissed suggestions', () => {
    dismissSuggestion('proactive-autonomous-pricing');
    const ids = getProactiveSuggestions().map((s) => s.id);
    expect(ids).not.toContain('proactive-autonomous-pricing');
    expect(ids).toHaveLength(4);
  });

  it('filters snoozed suggestions', () => {
    snoozeSuggestion('proactive-margin-audio');
    const ids = getProactiveSuggestions().map((s) => s.id);
    expect(ids).not.toContain('proactive-margin-audio');
    expect(ids).toHaveLength(4);
  });
});

describe('RETURN_RISK_ORDERS via applyCommandComplete', () => {
  it('reveals returns card', () => {
    const initial = getInitialTodayReadyInsights();
    const response = buildDemoResponse('Toon orders met hoge retourkans');
    const next = applyCommandComplete(initial, response);

    const returns = next.find((i) => i.id === 'returns')!;
    expect(returns.visible).toBe(true);
    expect(returns.justAppeared).toBe(true);
    expect(visibleInsightIds(next)[0]).toBe('returns');
    expect(returns.listItems?.length).toBeGreaterThan(0);
  });
});
