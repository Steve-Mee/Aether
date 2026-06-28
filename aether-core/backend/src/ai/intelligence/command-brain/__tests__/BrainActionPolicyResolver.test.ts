import { shouldDeferToTools, isMutatingIntent } from '../BrainActionPolicyResolver';
import { DEFAULT_MERCHANT_SETTINGS } from '../../../../shared/settings/merchantSettingsTypes';

describe('BrainActionPolicyResolver', () => {
  it('defers mutating intents in always_confirm mode', () => {
    expect(
      shouldDeferToTools({
        settings: { ...DEFAULT_MERCHANT_SETTINGS, brainActionMode: 'always_confirm' },
        intent: 'PRICE_UPDATE',
        confidence: 0.95,
      })
    ).toBe(true);
  });

  it('executes directly on high confidence in confirm_on_uncertain mode', () => {
    expect(
      shouldDeferToTools({
        settings: { ...DEFAULT_MERCHANT_SETTINGS, brainActionMode: 'confirm_on_uncertain' },
        intent: 'PRICE_UPDATE',
        confidence: 0.9,
      })
    ).toBe(false);
  });

  it('defers on low confidence in confirm_on_uncertain mode', () => {
    expect(
      shouldDeferToTools({
        settings: { ...DEFAULT_MERCHANT_SETTINGS, brainActionMode: 'confirm_on_uncertain' },
        intent: 'PRICE_UPDATE',
        confidence: 0.5,
      })
    ).toBe(true);
  });

  it('identifies mutating intents', () => {
    expect(isMutatingIntent('PRICE_UPDATE')).toBe(true);
    expect(isMutatingIntent('INVENTORY_STATUS')).toBe(false);
  });
});
