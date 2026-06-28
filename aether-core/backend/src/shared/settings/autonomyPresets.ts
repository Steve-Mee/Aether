import type {
  AutonomyActionCategory,
  AutonomyAgentKey,
  AutonomyCategoryPolicy,
  AutonomyPreset,
  AgentAutonomyOverride,
} from './autonomyTypes';
import { AUTONOMY_AGENT_KEYS, DEFAULT_CATEGORY_POLICIES } from './autonomyTypes';
import type { AutonomyLevel, GoalPursuitMode, MerchantSettings } from './merchantSettingsTypes';

export interface AutonomyPresetBundle {
  preset: AutonomyPreset;
  autonomyLevel: AutonomyLevel;
  policyEnabled: boolean;
  autoApproveLowRisk: boolean;
  autoApproveMediumRiskMail: boolean;
  actionCategories: Record<AutonomyActionCategory, AutonomyCategoryPolicy>;
  agentOverrides: Partial<Record<AutonomyAgentKey, AgentAutonomyOverride>>;
  proactiveAllowAutoExecute: boolean;
  goalAllowGoalLinkedAutoExecute: boolean;
  goalPursuitMode: GoalPursuitMode;
}

function categories(
  overrides: Partial<Record<AutonomyActionCategory, Partial<AutonomyCategoryPolicy>>>,
): Record<AutonomyActionCategory, AutonomyCategoryPolicy> {
  const base = { ...DEFAULT_CATEGORY_POLICIES };
  for (const [key, val] of Object.entries(overrides) as [
    AutonomyActionCategory,
    Partial<AutonomyCategoryPolicy>,
  ][]) {
    base[key] = { ...base[key], ...val };
  }
  return base;
}

function agentPriorities(
  priorities: Partial<Record<AutonomyAgentKey, number>>,
): Partial<Record<AutonomyAgentKey, AgentAutonomyOverride>> {
  const result: Partial<Record<AutonomyAgentKey, AgentAutonomyOverride>> = {};
  for (const [key, priority] of Object.entries(priorities) as [AutonomyAgentKey, number][]) {
    result[key] = {
      enabled: true,
      priority,
      allowLowRiskAutoExecute: null,
      allowMediumRiskAutoExecute: null,
    };
  }
  return result;
}

const conservativeAgents = agentPriorities(
  Object.fromEntries(AUTONOMY_AGENT_KEYS.map((k) => [k, 3])) as Record<AutonomyAgentKey, number>,
);

const aggressiveAgents = agentPriorities({
  pricing: 9,
  inventory: 8,
  supplier: 7,
  promotion: 7,
  mail: 6,
  negotiation: 5,
  customer: 5,
  forecast: 5,
  catalog: 5,
  outcomes: 5,
  approvals: 4,
});

export const AUTONOMY_PRESET_BUNDLES: Record<
  Exclude<AutonomyPreset, 'custom'>,
  AutonomyPresetBundle
> = {
  conservative: {
    preset: 'conservative',
    autonomyLevel: 'low',
    policyEnabled: true,
    autoApproveLowRisk: false,
    autoApproveMediumRiskMail: false,
    actionCategories: categories({}),
    agentOverrides: conservativeAgents,
    proactiveAllowAutoExecute: false,
    goalAllowGoalLinkedAutoExecute: false,
    goalPursuitMode: 'conservative',
  },
  balanced: {
    preset: 'balanced',
    autonomyLevel: 'medium',
    policyEnabled: true,
    autoApproveLowRisk: true,
    autoApproveMediumRiskMail: false,
    actionCategories: categories({
      mail: { allowLowRiskAutoExecute: true },
    }),
    agentOverrides: {},
    proactiveAllowAutoExecute: false,
    goalAllowGoalLinkedAutoExecute: false,
    goalPursuitMode: 'balanced',
  },
  aggressive: {
    preset: 'aggressive',
    autonomyLevel: 'high',
    policyEnabled: true,
    autoApproveLowRisk: true,
    autoApproveMediumRiskMail: true,
    actionCategories: categories({
      pricing: { allowLowRiskAutoExecute: true, allowMediumRiskAutoExecute: true },
      inventory: { allowLowRiskAutoExecute: true, allowMediumRiskAutoExecute: true },
      supplier: { allowLowRiskAutoExecute: true },
      promotion: { allowLowRiskAutoExecute: true },
      mail: { allowLowRiskAutoExecute: true, allowMediumRiskAutoExecute: true },
      negotiation: { allowLowRiskAutoExecute: true },
    }),
    agentOverrides: aggressiveAgents,
    proactiveAllowAutoExecute: true,
    goalAllowGoalLinkedAutoExecute: true,
    goalPursuitMode: 'aggressive',
  },
};

export function applyAutonomyPreset(
  preset: Exclude<AutonomyPreset, 'custom'>,
): Partial<MerchantSettings> {
  const bundle = AUTONOMY_PRESET_BUNDLES[preset];
  return {
    autonomyLevel: bundle.autonomyLevel,
    policyEnabled: bundle.policyEnabled,
    autoApproveLowRisk: bundle.autoApproveLowRisk,
    autoApproveMediumRiskMail: bundle.autoApproveMediumRiskMail,
    autonomyPrefs: {
      preset: bundle.preset,
      actionCategories: bundle.actionCategories,
      agentOverrides: bundle.agentOverrides,
      customRules: [],
    },
    proactivePrefs: {
      allowAutoExecute: bundle.proactiveAllowAutoExecute,
    },
    goalPrefs: {
      defaultPursuitMode: bundle.goalPursuitMode,
      allowGoalLinkedAutoExecute: bundle.goalAllowGoalLinkedAutoExecute,
    },
  };
}

export function getPresetBundle(preset: AutonomyPreset): AutonomyPresetBundle | null {
  if (preset === 'custom') return null;
  return AUTONOMY_PRESET_BUNDLES[preset];
}
