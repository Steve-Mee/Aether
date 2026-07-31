import type { DemoIntentMatch, DemoIntentId, DemoSuggestion, SuggestionCategory } from './types';
import {
  buildContextualSuggestions,
  type ContextualSuggestion,
  type SuggestionBuildInput,
} from '../commandSuggestionContext';
import { DEMO_SUGGESTIONS, IDLE_SUGGESTION_IDS } from './demoSuggestions';
import { CATEGORY_LABELS } from './metadata';
import { detectIntent } from './intentRules';
import { normalize } from './intentRuleTable';

export type { SuggestionBuildInput };

function scoreSuggestion(s: DemoSuggestion, t: string, intent: DemoIntentMatch): number {
  const hay = `${s.label} ${s.command} ${s.hint ?? ''}`.toLowerCase();
  const tokens = t.split(/\s+/).filter(Boolean);
  let tokenScore = tokens.reduce((acc, tok) => (hay.includes(tok) ? acc + 1 : acc), 0);
  if (t.length >= 2 && hay.startsWith(t.slice(0, 2))) tokenScore += 2;
  const intentBoost = s.intentId === intent.id ? 3 : 0;
  const categoryBoost = s.category === categoryForIntent(intent.id) ? 1 : 0;
  const contextBoost = (s.priority ?? 0) >= 6 ? 2 : 0;
  return tokenScore + intentBoost + categoryBoost + contextBoost;
}

export function mergeAndRankSuggestions(
  input: string,
  contextInput: SuggestionBuildInput | null,
  limit = 6,
): DemoSuggestion[] {
  const t = normalize(input);
  const intent = detectIntent(input);
  const contextual = contextInput ? buildContextualSuggestions(contextInput) : [];
  const pool = new Map<string, DemoSuggestion>();
  for (const s of DEMO_SUGGESTIONS) pool.set(s.id, s);
  for (const c of contextual) {
    if (!pool.has(c.id)) pool.set(c.id, c);
  }
  const all = [...pool.values()];
  if (!t) {
    const idle = getIdleSuggestions();
    const ctxTop = contextual.sort((a, b) => b.priority - a.priority).slice(0, 2);
    const merged = [
      ...ctxTop,
      ...idle.filter((i) => !ctxTop.some((c) => c.intentId === i.intentId)),
    ];
    return merged.slice(0, limit);
  }
  const scored = all.map((s) => ({ s, score: scoreSuggestion(s, t, intent) }));
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.s);
}

export function filterSuggestions(input: string, limit = 6): DemoSuggestion[] {
  return mergeAndRankSuggestions(input, null, limit);
}

export function getContextualSuggestionsForUnknown(
  contextInput: SuggestionBuildInput,
  limit = 2,
): ContextualSuggestion[] {
  return buildContextualSuggestions(contextInput)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}
function categoryForIntent(id: DemoIntentId): SuggestionCategory | null {
  const match = DEMO_SUGGESTIONS.find((s) => s.intentId === id);
  return match?.category ?? null;
}
export function getIdleSuggestions(): DemoSuggestion[] {
  return IDLE_SUGGESTION_IDS.map((id) => DEMO_SUGGESTIONS.find((s) => s.id === id)!);
}
export function groupSuggestionsByCategory(
  suggestions: DemoSuggestion[],
): { category: SuggestionCategory; label: string; items: DemoSuggestion[] }[] {
  const groups = new Map<SuggestionCategory, DemoSuggestion[]>();
  for (const s of suggestions) {
    const list = groups.get(s.category) ?? [];
    list.push(s);
    groups.set(s.category, list);
  }
  const order: SuggestionCategory[] = [
    'prijs',
    'leverancier',
    'goedkeuringen',
    'inzicht',
    'autonomie',
    'overzicht',
  ];
  return order
    .filter((cat) => groups.has(cat))
    .map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      items: groups.get(cat)!,
    }));
}
