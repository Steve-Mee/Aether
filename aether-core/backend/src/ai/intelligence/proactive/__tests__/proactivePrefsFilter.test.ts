import { DEFAULT_PROACTIVE_PREFS } from '../../../../shared/settings/merchantSettingsTypes';
import {
  filterProactiveByPrefs,
  isProactiveCategoryEnabled,
  proactivePrefsAllowsIngest,
} from '../proactivePrefsFilter';

describe('proactivePrefsFilter', () => {
  const sample = [
    { category: 'prijs', riskLevel: 'medium', executionMode: 'approval_required' },
    { category: 'voorraad', riskLevel: 'low', executionMode: 'autonomous' },
    { category: 'algemeen', riskLevel: 'low', executionMode: 'inform_only' },
  ];

  it('blocks ingest when disabled', () => {
    expect(proactivePrefsAllowsIngest({ ...DEFAULT_PROACTIVE_PREFS, enabled: false })).toBe(false);
    expect(
      proactivePrefsAllowsIngest({ ...DEFAULT_PROACTIVE_PREFS, enabled: true, visibility: 'off' })
    ).toBe(false);
  });

  it('filters low_risk_only visibility', () => {
    const prefs = { ...DEFAULT_PROACTIVE_PREFS, enabled: true, visibility: 'low_risk_only' as const };
    const result = filterProactiveByPrefs(sample, prefs);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.riskLevel === 'low' || r.executionMode === 'inform_only')).toBe(
      true
    );
  });

  it('respects category toggles', () => {
    expect(isProactiveCategoryEnabled('prijs', DEFAULT_PROACTIVE_PREFS)).toBe(true);
    expect(
      isProactiveCategoryEnabled('prijs', {
        ...DEFAULT_PROACTIVE_PREFS,
        categories: { ...DEFAULT_PROACTIVE_PREFS.categories, prijs: false },
      })
    ).toBe(false);
  });

  it('caps maxActive', () => {
    const prefs = { ...DEFAULT_PROACTIVE_PREFS, enabled: true, maxActive: 1 };
    expect(filterProactiveByPrefs(sample, prefs)).toHaveLength(1);
  });
});
