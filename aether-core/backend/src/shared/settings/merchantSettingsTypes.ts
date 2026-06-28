import type { AutonomyPrefs } from './autonomyTypes';
import { DEFAULT_AUTONOMY_PREFS, parseAutonomyPrefs } from './autonomyTypes';

export type AutonomyLevel = 'low' | 'medium' | 'high';
export type AutoRunWindow = 'always' | 'outside_office' | 'custom';
export type Locale = 'nl' | 'en';
export type NotificationFrequency = 'immediate' | 'daily' | 'weekly';

export type {
  AutonomyPreset,
  AutonomyActionCategory,
  AutonomyCategoryPolicy,
  AutonomyPrefs,
} from './autonomyTypes';
export {
  AUTONOMY_ACTION_CATEGORIES,
  DEFAULT_AUTONOMY_PREFS,
  DEFAULT_CATEGORY_POLICIES,
  parseAutonomyPrefs,
  inferPresetFromAutonomyLevel,
} from './autonomyTypes';

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

export function parseExplainabilityPrefs(raw: unknown): ExplainabilityPrefs {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_EXPLAINABILITY_PREFS };
  }
  const obj = raw as Record<string, unknown>;
  const level = obj.detailLevel;
  const detailLevel: ExplainabilityDetailLevel =
    level === 'off' || level === 'extended' ? level : 'simple';
  return {
    detailLevel,
    useLlmSummary: obj.useLlmSummary === true,
    showLiveExplain: obj.showLiveExplain !== false,
    showSimilarActions: obj.showSimilarActions !== false,
    showCrossTenantSimilarActions: obj.showCrossTenantSimilarActions === true,
  };
}

export function parseGoalPrefs(raw: unknown): GoalPrefs {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_GOAL_PREFS };
  }
  const obj = raw as Record<string, unknown>;
  const mode = obj.defaultPursuitMode;
  const defaultPursuitMode: GoalPursuitMode =
    mode === 'conservative' || mode === 'aggressive' ? mode : 'balanced';
  const maxActive = Number(obj.maxActive);
  const conflict = obj.conflictResolution;
  const conflictResolution: GoalConflictResolution =
    conflict === 'auto_deprioritize' || conflict === 'auto_pause_lower' ? conflict : 'manual';
  return {
    enabled: obj.enabled === true,
    maxActive: Number.isFinite(maxActive) && maxActive > 0 ? Math.min(maxActive, 20) : 5,
    defaultPursuitMode,
    allowGoalLinkedAutoExecute: obj.allowGoalLinkedAutoExecute === true,
    showOnCommandCenter: obj.showOnCommandCenter !== false,
    conflictResolution,
    allowFederatedContribution: obj.allowFederatedContribution === true,
    showGlobalHints: obj.showGlobalHints === true,
  };
}

const OVERVIEW_SECTION_KEYS = [
  'attention',
  'agentMetrics',
  'handoffs',
  'proactive',
  'goals',
  'activity',
] as const;

export function parseOverviewPrefs(raw: unknown): OverviewPrefs {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_OVERVIEW_PREFS,
      sectionOrder: [...DEFAULT_OVERVIEW_PREFS.sectionOrder],
      sections: { ...DEFAULT_OVERVIEW_SECTION_PREFS },
      collapsed: {},
    };
  }
  const obj = raw as Record<string, unknown>;
  const period = obj.defaultPeriod;
  const defaultPeriod: OverviewDefaultPeriod =
    period === '24h' || period === '30d' ? period : '7d';
  const orderRaw = obj.sectionOrder;
  const sectionOrder: OverviewSectionKey[] = Array.isArray(orderRaw)
    ? orderRaw.filter((k): k is OverviewSectionKey =>
        typeof k === 'string' && (OVERVIEW_SECTION_KEYS as readonly string[]).includes(k),
      )
    : [...DEFAULT_OVERVIEW_PREFS.sectionOrder];
  const sectionsRaw = obj.sections;
  const sections: OverviewSectionPrefs = { ...DEFAULT_OVERVIEW_SECTION_PREFS };
  if (sectionsRaw && typeof sectionsRaw === 'object') {
    const s = sectionsRaw as Record<string, unknown>;
    for (const key of OVERVIEW_SECTION_KEYS) {
      if (typeof s[key] === 'boolean') {
        sections[key] = s[key] as boolean;
      }
    }
  }
  const collapsedRaw = obj.collapsed;
  const collapsed: Partial<Record<OverviewSectionKey, boolean>> = {};
  if (collapsedRaw && typeof collapsedRaw === 'object') {
    const c = collapsedRaw as Record<string, unknown>;
    for (const key of OVERVIEW_SECTION_KEYS) {
      if (typeof c[key] === 'boolean') {
        collapsed[key] = c[key] as boolean;
      }
    }
  }
  return {
    enabled: obj.enabled !== false,
    sectionOrder: sectionOrder.length > 0 ? sectionOrder : [...DEFAULT_OVERVIEW_PREFS.sectionOrder],
    collapsed,
    sections,
    defaultPeriod,
  };
}

export function parseProactivePrefs(raw: unknown): ProactivePrefs {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_PROACTIVE_PREFS,
      categories: { ...DEFAULT_PROACTIVE_PREFS.categories },
    };
  }
  const obj = raw as Record<string, unknown>;
  const visibility = obj.visibility;
  const vis: ProactiveVisibility =
    visibility === 'off' || visibility === 'all' ? visibility : 'low_risk_only';
  const cats = obj.categories;
  const categories: ProactiveCategoryPrefs = { ...DEFAULT_PROACTIVE_PREFS.categories };
  if (cats && typeof cats === 'object') {
    const c = cats as Record<string, unknown>;
    if (typeof c.prijs === 'boolean') categories.prijs = c.prijs;
    if (typeof c.leverancier === 'boolean') categories.leverancier = c.leverancier;
    if (typeof c.voorraad === 'boolean') categories.voorraad = c.voorraad;
    if (typeof c.algemeen === 'boolean') categories.algemeen = c.algemeen;
  }
  const maxActive = Number(obj.maxActive);
  const snoozeDefaultHours = Number(obj.snoozeDefaultHours);
  return {
    enabled: obj.enabled === true,
    visibility: vis,
    maxActive: Number.isFinite(maxActive) && maxActive > 0 ? Math.min(maxActive, 20) : 5,
    allowAutoExecute: obj.allowAutoExecute === true,
    snoozeDefaultHours:
      Number.isFinite(snoozeDefaultHours) && snoozeDefaultHours > 0 ? snoozeDefaultHours : 24,
    categories,
  };
}

export function parseNotificationPrefs(raw: unknown): NotificationPrefs {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
  const obj = raw as Record<string, unknown>;
  const channel = (key: keyof Omit<NotificationPrefs, 'frequency'>, fallback: NotificationChannelPrefs) => {
    const val = obj[key];
    if (!val || typeof val !== 'object') return { ...fallback };
    const c = val as Record<string, unknown>;
    return {
      inApp: c.inApp !== false,
      email: c.email === true,
      push: c.push === true,
    };
  };
  const freq = obj.frequency;
  const frequency: NotificationFrequency =
    freq === 'daily' || freq === 'weekly' ? freq : 'immediate';
  return {
    autonomousLowRisk: channel('autonomousLowRisk', DEFAULT_NOTIFICATION_PREFS.autonomousLowRisk),
    highRiskApproval: channel('highRiskApproval', DEFAULT_NOTIFICATION_PREFS.highRiskApproval),
    supplierChanges: channel('supplierChanges', DEFAULT_NOTIFICATION_PREFS.supplierChanges),
    weeklyDigest: channel('weeklyDigest', DEFAULT_NOTIFICATION_PREFS.weeklyDigest),
    proactiveSuggestions: channel(
      'proactiveSuggestions',
      DEFAULT_NOTIFICATION_PREFS.proactiveSuggestions
    ),
    goalProgress: channel('goalProgress', DEFAULT_NOTIFICATION_PREFS.goalProgress),
    frequency,
  };
}

export function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Returns true when autonomous actions are allowed at the given time. */
export function isAutonomousWindowOpen(
  settings: Pick<MerchantSettings, 'autoRunWindow' | 'autoRunWindowStart' | 'autoRunWindowEnd'>,
  now: Date = new Date()
): boolean {
  if (settings.autoRunWindow === 'always') return true;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (settings.autoRunWindow === 'outside_office') {
    const officeStart = 9 * 60;
    const officeEnd = 18 * 60;
    return currentMinutes < officeStart || currentMinutes >= officeEnd;
  }

  const start = parseTimeToMinutes(settings.autoRunWindowStart) ?? 18 * 60;
  const end = parseTimeToMinutes(settings.autoRunWindowEnd) ?? 8 * 60;
  if (start === end) return true;
  if (start < end) {
    return currentMinutes >= start && currentMinutes < end;
  }
  return currentMinutes >= start || currentMinutes < end;
}

export function extractMarginImpact(payload: Record<string, unknown>): number {
  const raw =
    payload.estimatedImpactEuro ??
    payload.marginImpact ??
    payload.impactEuro ??
    payload.amount ??
    0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}
