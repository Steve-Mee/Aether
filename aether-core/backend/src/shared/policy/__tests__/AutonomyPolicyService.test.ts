import { DEFAULT_MERCHANT_SETTINGS } from '../../settings/merchantSettingsTypes';
import { assessAutonomy } from '../AutonomyPolicyService';

describe('AutonomyPolicyService', () => {
  const baseSettings = {
    ...DEFAULT_MERCHANT_SETTINGS,
    autonomyPrefs: {
      ...DEFAULT_MERCHANT_SETTINGS.autonomyPrefs,
      actionCategories: {
        ...DEFAULT_MERCHANT_SETTINGS.autonomyPrefs.actionCategories,
        pricing: {
          enabled: true,
          allowLowRiskAutoExecute: false,
          allowMediumRiskAutoExecute: false,
        },
      },
    },
  };

  it('always requires approval for high risk', () => {
    const result = assessAutonomy({
      settings: baseSettings,
      module: 'payment-fulfillment',
      actionType: 'payment.refund',
      riskClass: 'high',
    });
    expect(result.executionMode).toBe('approval_required');
    expect(result.reasonCode).toBe('high_risk_guard');
    expect(result.eligible).toBe(false);
  });

  it('blocks when category disabled', () => {
    const settings = {
      ...baseSettings,
      autonomyPrefs: {
        ...baseSettings.autonomyPrefs,
        actionCategories: {
          ...baseSettings.autonomyPrefs.actionCategories,
          pricing: {
            enabled: false,
            allowLowRiskAutoExecute: false,
            allowMediumRiskAutoExecute: false,
          },
        },
      },
    };
    const result = assessAutonomy({
      settings,
      tool: 'updatePrice',
      module: 'admin-command-bar',
      actionType: 'price.change',
      riskClass: 'low',
    });
    expect(result.executionMode).toBe('blocked');
    expect(result.reasonCode).toBe('category_disabled');
  });

  it('blocks when margin exceeded', () => {
    const result = assessAutonomy({
      settings: baseSettings,
      module: 'admin-command-bar',
      actionType: 'price.change',
      payload: { marginImpact: 1000 },
      riskClass: 'medium',
    });
    expect(result.executionMode).toBe('approval_required');
    expect(result.reasonCode).toBe('margin_exceeded');
  });

  it('allows low risk when policy and category permit', () => {
    const settings = {
      ...baseSettings,
      autonomyPrefs: {
        ...baseSettings.autonomyPrefs,
        actionCategories: {
          ...baseSettings.autonomyPrefs.actionCategories,
          mail: {
            enabled: true,
            allowLowRiskAutoExecute: true,
            allowMediumRiskAutoExecute: false,
          },
        },
      },
    };
    const result = assessAutonomy({
      settings,
      module: 'aether-mail',
      actionType: 'email.auto_reply',
      riskClass: 'low',
    });
    expect(result.eligible).toBe(true);
    expect(result.executionMode).toBe('autonomous');
  });

  it('requires approval when policy disabled', () => {
    const result = assessAutonomy({
      settings: { ...baseSettings, policyEnabled: false },
      module: 'personal-brain',
      actionType: 'brain.recall',
      riskClass: 'low',
    });
    expect(result.executionMode).toBe('approval_required');
    expect(result.reasonCode).toBe('policy_disabled');
  });
});
