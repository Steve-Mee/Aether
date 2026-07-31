import {
  DEFAULT_EXPLAINABILITY_PREFS,
  DEFAULT_GOAL_PREFS,
  DEFAULT_NOTIFICATION_PREFS,
  DEFAULT_OVERVIEW_PREFS,
  DEFAULT_OVERVIEW_SECTION_PREFS,
  DEFAULT_PROACTIVE_PREFS,
  type ExplainabilityDetailLevel,
  type ExplainabilityPrefs,
  type GoalConflictResolution,
  type GoalPrefs,
  type GoalPursuitMode,
  type NotificationChannelPrefs,
  type NotificationFrequency,
  type NotificationPrefs,
  type OverviewDefaultPeriod,
  type OverviewPrefs,
  type OverviewSectionKey,
  type OverviewSectionPrefs,
  type ProactiveCategoryPrefs,
  type ProactivePrefs,
  type ProactiveVisibility,
} from './merchantPrefsTypes';

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
