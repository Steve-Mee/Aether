import { applyAutonomyPreset, AUTONOMY_PRESET_BUNDLES } from '../autonomyPresets';

describe('autonomyPresets', () => {
  it('conservative preset disables auto-approve low risk', () => {
    const patch = applyAutonomyPreset('conservative');
    expect(patch.autonomyLevel).toBe('low');
    expect(patch.autoApproveLowRisk).toBe(false);
    expect(patch.autonomyPrefs?.preset).toBe('conservative');
    expect(patch.proactivePrefs?.allowAutoExecute).toBe(false);
  });

  it('aggressive preset enables broader category auto-execute', () => {
    const patch = applyAutonomyPreset('aggressive');
    expect(patch.autonomyLevel).toBe('high');
    expect(patch.autonomyPrefs?.actionCategories.pricing.allowLowRiskAutoExecute).toBe(true);
    expect(patch.goalPrefs?.allowGoalLinkedAutoExecute).toBe(true);
  });

  it('balanced preset allows mail low-risk only', () => {
    const bundle = AUTONOMY_PRESET_BUNDLES.balanced;
    expect(bundle.actionCategories.mail.allowLowRiskAutoExecute).toBe(true);
    expect(bundle.actionCategories.pricing.allowLowRiskAutoExecute).toBe(false);
  });
});
