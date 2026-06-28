import type { ProactivePrefs } from '../../../shared/settings/merchantSettingsTypes';

export interface ProactiveSuggestionLike {
  category: string;
  riskLevel: string;
  executionMode: string;
}

const CATEGORY_MAP: Record<string, keyof ProactivePrefs['categories']> = {
  prijs: 'prijs',
  leverancier: 'leverancier',
  voorraad: 'voorraad',
  algemeen: 'algemeen',
  marge: 'prijs',
  orders: 'voorraad',
};

export function isProactiveCategoryEnabled(
  category: string,
  prefs: ProactivePrefs
): boolean {
  const key = CATEGORY_MAP[category] ?? 'algemeen';
  return prefs.categories[key] !== false;
}

export function filterProactiveByPrefs<T extends ProactiveSuggestionLike>(
  suggestions: T[],
  prefs: ProactivePrefs
): T[] {
  if (!prefs.enabled || prefs.visibility === 'off') return [];

  let filtered = suggestions.filter((s) => isProactiveCategoryEnabled(s.category, prefs));

  if (prefs.visibility === 'low_risk_only') {
    filtered = filtered.filter(
      (s) => s.riskLevel === 'low' || s.executionMode === 'inform_only'
    );
  }

  return filtered.slice(0, prefs.maxActive);
}

export function proactivePrefsAllowsIngest(prefs: ProactivePrefs): boolean {
  return prefs.enabled && prefs.visibility !== 'off';
}
