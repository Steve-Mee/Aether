import type { AutonomyPrefs } from './autonomyTypes';
import { DEFAULT_AUTONOMY_PREFS } from './autonomyTypes';

export type AutonomyLevel = 'low' | 'medium' | 'high';
export type AutoRunWindow = 'always' | 'outside_office' | 'custom';
export type Locale = 'nl' | 'en';
export type NotificationFrequency = 'immediate' | 'daily' | 'weekly';

export interface NotificationChannelPrefs {
  inApp: boolean;
  email: boolean;
  push?: boolean;
}

export interface NotificationPrefs {
  autonomousLowRisk: NotificationChannelPrefs;
  highRiskApproval: NotificationChannelPrefs;
  supplierChanges: NotificationChannelPrefs;
  weeklyDigest: NotificationChannelPrefs;
  proactiveSuggestions: NotificationChannelPrefs;
  goalProgress: NotificationChannelPrefs;
  frequency: NotificationFrequency;
}

export type BrainVectorBackend = 'pgvector' | 'lancedb' | 'memory';
export type BrainActionMode = 'always_confirm' | 'confirm_on_uncertain' | 'adaptive';
export type BrainKnowledgeUpdateProfile = 'conservative' | 'balanced' | 'aggressive';
export type BrainKnowledgeGovernanceMode = 'contribute_only' | 'receive_only' | 'full_loop';

export type ProactiveVisibility = 'off' | 'low_risk_only' | 'all';

export type GoalPursuitMode = 'conservative' | 'balanced' | 'aggressive';

export type GoalConflictResolution = 'manual' | 'auto_deprioritize' | 'auto_pause_lower';

export interface GoalPrefs {
  enabled: boolean;
  maxActive: number;
  defaultPursuitMode: GoalPursuitMode;
  allowGoalLinkedAutoExecute: boolean;
  showOnCommandCenter: boolean;
  conflictResolution: GoalConflictResolution;
  allowFederatedContribution: boolean;
  showGlobalHints: boolean;
}

export const DEFAULT_GOAL_PREFS: GoalPrefs = {
  enabled: false,
  maxActive: 5,
  defaultPursuitMode: 'balanced',
  allowGoalLinkedAutoExecute: false,
  showOnCommandCenter: true,
  conflictResolution: 'manual',
  allowFederatedContribution: false,
  showGlobalHints: false,
};

export type OverviewSectionKey =
  | 'attention'
  | 'agentMetrics'
  | 'handoffs'
  | 'proactive'
  | 'goals'
  | 'activity';

export interface OverviewSectionPrefs {
  attention: boolean;
  agentMetrics: boolean;
  handoffs: boolean;
  proactive: boolean;
  goals: boolean;
  activity: boolean;
}

export type OverviewDefaultPeriod = '24h' | '7d' | '30d';

export interface OverviewPrefs {
  enabled: boolean;
  sectionOrder: OverviewSectionKey[];
  collapsed: Partial<Record<OverviewSectionKey, boolean>>;
  sections: OverviewSectionPrefs;
  defaultPeriod: OverviewDefaultPeriod;
}

export const DEFAULT_OVERVIEW_SECTION_PREFS: OverviewSectionPrefs = {
  attention: true,
  agentMetrics: true,
  handoffs: true,
  proactive: true,
  goals: true,
  activity: true,
};

export const DEFAULT_OVERVIEW_PREFS: OverviewPrefs = {
  enabled: true,
  sectionOrder: ['attention', 'agentMetrics', 'handoffs', 'proactive', 'goals', 'activity'],
  collapsed: {},
  sections: { ...DEFAULT_OVERVIEW_SECTION_PREFS },
  defaultPeriod: '7d',
};

export interface ProactiveCategoryPrefs {
  prijs: boolean;
  leverancier: boolean;
  voorraad: boolean;
  algemeen: boolean;
}

export interface ProactivePrefs {
  enabled: boolean;
  visibility: ProactiveVisibility;
  maxActive: number;
  allowAutoExecute: boolean;
  snoozeDefaultHours: number;
  categories: ProactiveCategoryPrefs;
}

export const DEFAULT_PROACTIVE_PREFS: ProactivePrefs = {
  enabled: false,
  visibility: 'low_risk_only',
  maxActive: 5,
  allowAutoExecute: false,
  snoozeDefaultHours: 24,
  categories: {
    prijs: true,
    leverancier: true,
    voorraad: true,
    algemeen: true,
  },
};

export type ExplainabilityDetailLevel = 'off' | 'simple' | 'extended';

export interface ExplainabilityPrefs {
  detailLevel: ExplainabilityDetailLevel;
  useLlmSummary?: boolean;
  showLiveExplain?: boolean;
  showSimilarActions?: boolean;
  showCrossTenantSimilarActions?: boolean;
}

export const DEFAULT_EXPLAINABILITY_PREFS: ExplainabilityPrefs = {
  detailLevel: 'simple',
  useLlmSummary: false,
  showLiveExplain: true,
  showSimilarActions: true,
  showCrossTenantSimilarActions: false,
};

export interface MerchantSettings {
  autonomyLevel: AutonomyLevel;
  autoApproveLowRisk: boolean;
  autoApproveMediumRiskMail: boolean;
  maxAutoPriceChangePct: number;
  maxMarginImpactEuro: number;
  policyEnabled: boolean;
  autoRunWindow: AutoRunWindow;
  autoRunWindowStart: string | null;
  autoRunWindowEnd: string | null;
  notificationPrefs: NotificationPrefs;
  locale: Locale;
  dataExportEnabled: boolean;
  brainVectorBackend: BrainVectorBackend | null;
  brainKnowledgeTransferEnabled: boolean | null;
  brainKnowledgeUpdateProfile: BrainKnowledgeUpdateProfile;
  brainFederatedContributionEnabled: boolean;
  brainKnowledgeGovernanceMode: BrainKnowledgeGovernanceMode;
  brainLoRAPath: string | null;
  brainActionMode: BrainActionMode;
  brainAdaptiveLearningEnabled: boolean;
  brainAdaptiveAutoExecuteEnabled: boolean;
  brainCrossTenantAgentPatternsEnabled: boolean;
  brainExplainabilityFederateEnabled: boolean;
  brainFederatedExecutionContribute: boolean;
  brainBilateralExchangeEnabled: boolean;
  proactivePrefs: ProactivePrefs;
  explainabilityPrefs: ExplainabilityPrefs;
  goalPrefs: GoalPrefs;
  overviewPrefs: OverviewPrefs;
  autonomyPrefs: AutonomyPrefs;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  autonomousLowRisk: { inApp: true, email: false },
  highRiskApproval: { inApp: true, email: true },
  supplierChanges: { inApp: true, email: false },
  weeklyDigest: { inApp: true, email: true },
  proactiveSuggestions: { inApp: true, email: false },
  goalProgress: { inApp: true, email: false },
  frequency: 'immediate',
};

export const DEFAULT_MERCHANT_SETTINGS: MerchantSettings = {
  autonomyLevel: 'medium',
  autoApproveLowRisk: true,
  autoApproveMediumRiskMail: false,
  maxAutoPriceChangePct: 5,
  maxMarginImpactEuro: 500,
  policyEnabled: true,
  autoRunWindow: 'always',
  autoRunWindowStart: '18:00',
  autoRunWindowEnd: '08:00',
  notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
  locale: 'nl',
  dataExportEnabled: true,
  brainVectorBackend: null,
  brainKnowledgeTransferEnabled: null,
  brainKnowledgeUpdateProfile: 'balanced',
  brainFederatedContributionEnabled: false,
  brainKnowledgeGovernanceMode: 'full_loop',
  brainLoRAPath: null,
  brainActionMode: 'confirm_on_uncertain',
  brainAdaptiveLearningEnabled: false,
  brainAdaptiveAutoExecuteEnabled: false,
  brainCrossTenantAgentPatternsEnabled: false,
  brainExplainabilityFederateEnabled: false,
  brainFederatedExecutionContribute: false,
  brainBilateralExchangeEnabled: false,
  proactivePrefs: { ...DEFAULT_PROACTIVE_PREFS, categories: { ...DEFAULT_PROACTIVE_PREFS.categories } },
  explainabilityPrefs: { ...DEFAULT_EXPLAINABILITY_PREFS },
  goalPrefs: { ...DEFAULT_GOAL_PREFS },
  overviewPrefs: {
    ...DEFAULT_OVERVIEW_PREFS,
    sectionOrder: [...DEFAULT_OVERVIEW_PREFS.sectionOrder],
    sections: { ...DEFAULT_OVERVIEW_SECTION_PREFS },
    collapsed: {},
  },
  autonomyPrefs: { ...DEFAULT_AUTONOMY_PREFS, actionCategories: { ...DEFAULT_AUTONOMY_PREFS.actionCategories } },
};
