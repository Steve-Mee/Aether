import { DEFAULT_MERCHANT_SETTINGS } from '../merchantSettingsTypes';
import { isCategoryWindowOpen } from '../categoryWindow';

describe('isCategoryWindowOpen', () => {
  it('returns true for continuous schedule', () => {
    const settings = { ...DEFAULT_MERCHANT_SETTINGS };
    expect(isCategoryWindowOpen('pricing', settings, new Date('2026-06-15T14:00:00'))).toBe(true);
  });

  it('returns false inside custom closed window', () => {
    const settings = {
      ...DEFAULT_MERCHANT_SETTINGS,
      autonomyPrefs: {
        ...DEFAULT_MERCHANT_SETTINGS.autonomyPrefs,
        actionCategories: {
          ...DEFAULT_MERCHANT_SETTINGS.autonomyPrefs.actionCategories,
          pricing: {
            ...DEFAULT_MERCHANT_SETTINGS.autonomyPrefs.actionCategories.pricing,
            schedule: {
              mode: 'custom' as const,
              windowStart: '09:00',
              windowEnd: '12:00',
            },
          },
        },
      },
    };
    expect(isCategoryWindowOpen('pricing', settings, new Date('2026-06-15T14:00:00'))).toBe(false);
    expect(isCategoryWindowOpen('pricing', settings, new Date('2026-06-15T10:00:00'))).toBe(true);
  });

  it('uses outside office preset', () => {
    const settings = {
      ...DEFAULT_MERCHANT_SETTINGS,
      autonomyPrefs: {
        ...DEFAULT_MERCHANT_SETTINGS.autonomyPrefs,
        actionCategories: {
          ...DEFAULT_MERCHANT_SETTINGS.autonomyPrefs.actionCategories,
          mail: {
            ...DEFAULT_MERCHANT_SETTINGS.autonomyPrefs.actionCategories.mail,
            schedule: {
              mode: 'custom' as const,
              useOutsideOfficePreset: true,
            },
          },
        },
      },
    };
    expect(isCategoryWindowOpen('mail', settings, new Date('2026-06-15T20:00:00'))).toBe(true);
    expect(isCategoryWindowOpen('mail', settings, new Date('2026-06-15T12:00:00'))).toBe(false);
  });
});
