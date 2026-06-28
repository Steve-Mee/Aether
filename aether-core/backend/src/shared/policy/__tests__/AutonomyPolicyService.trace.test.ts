import { DEFAULT_MERCHANT_SETTINGS } from '../../settings/merchantSettingsTypes';
import { assessAutonomyWithTrace } from '../AutonomyPolicyService';

describe('assessAutonomyWithTrace', () => {
  const baseSettings = {
    ...DEFAULT_MERCHANT_SETTINGS,
    policyEnabled: true,
    autoApproveLowRisk: true,
    autonomyPrefs: {
      ...DEFAULT_MERCHANT_SETTINGS.autonomyPrefs,
      actionCategories: {
        ...DEFAULT_MERCHANT_SETTINGS.autonomyPrefs.actionCategories,
        mail: {
          enabled: true,
          allowLowRiskAutoExecute: true,
          allowMediumRiskAutoExecute: false,
          schedule: { mode: 'continuous' as const },
        },
      },
    },
  };

  it('includes trace steps for high risk guard', () => {
    const result = assessAutonomyWithTrace({
      settings: baseSettings,
      module: 'payment-fulfillment',
      actionType: 'payment.refund',
      riskClass: 'high',
    });
    expect(result.trace.some((s) => s.step === 'high_risk_guard' && !s.passed)).toBe(true);
    expect(result.executionMode).toBe('approval_required');
  });

  it('records category window block in trace', () => {
    const settings = {
      ...baseSettings,
      autoRunWindow: 'always' as const,
      autonomyPrefs: {
        ...baseSettings.autonomyPrefs,
        actionCategories: {
          ...baseSettings.autonomyPrefs.actionCategories,
          pricing: {
            enabled: true,
            allowLowRiskAutoExecute: true,
            allowMediumRiskAutoExecute: false,
            schedule: {
              mode: 'custom' as const,
              windowStart: '09:00',
              windowEnd: '10:00',
              useOutsideOfficePreset: false,
            },
          },
        },
      },
    };
    const noon = new Date('2026-06-15T14:00:00');
    const result = assessAutonomyWithTrace({
      settings,
      module: 'admin-command-bar',
      actionType: 'price.change',
      payload: { percentage: 2 },
      riskClass: 'low',
      now: noon,
    });
    expect(result.reasonCode).toBe('category_outside_window');
    expect(result.trace.some((s) => s.step === 'category_window' && !s.passed)).toBe(true);
  });

  it('matches custom rule and returns matchedRuleId', () => {
    const settings = {
      ...baseSettings,
      autonomyPrefs: {
        ...baseSettings.autonomyPrefs,
        customRules: [
          {
            id: 'rule_small_price',
            enabled: true,
            name: 'Kleine prijs',
            sortOrder: 0,
            outcome: 'allow_auto' as const,
            conditions: [{ field: 'priceChangePct' as const, operator: 'lte' as const, value: 5 }],
          },
        ],
      },
    };
    const result = assessAutonomyWithTrace({
      settings,
      module: 'admin-command-bar',
      actionType: 'price.change',
      payload: { percentage: 3, priceChangePct: 3 },
      riskClass: 'medium',
    });
    expect(result.matchedRuleId).toBe('rule_small_price');
    expect(result.reasonCode).toBe('custom_rule_allow');
    expect(result.trace.some((s) => s.step === 'custom_rule')).toBe(true);
  });

  it('blocks disabled agent in trace', () => {
    const settings = {
      ...baseSettings,
      autonomyPrefs: {
        ...baseSettings.autonomyPrefs,
        agentOverrides: {
          pricing: {
            enabled: false,
            priority: 5,
            allowLowRiskAutoExecute: null,
            allowMediumRiskAutoExecute: null,
          },
        },
      },
    };
    const result = assessAutonomyWithTrace({
      settings,
      module: 'admin-command-bar',
      actionType: 'price.change',
      agentKey: 'pricing',
      riskClass: 'low',
    });
    expect(result.reasonCode).toBe('agent_disabled');
    expect(result.trace.some((s) => s.step === 'agent_enabled' && !s.passed)).toBe(true);
  });
});
