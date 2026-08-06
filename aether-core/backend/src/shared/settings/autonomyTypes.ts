export type AutonomyPreset = 'conservative' | 'balanced' | 'aggressive' | 'custom';

export type AutonomyActionCategory =
  | 'pricing'
  | 'supplier'
  | 'inventory'
  | 'promotion'
  | 'mail'
  | 'negotiation'
  | 'customer';

export const AUTONOMY_ACTION_CATEGORIES: AutonomyActionCategory[] = [
  'pricing',
  'supplier',
  'inventory',
  'promotion',
  'mail',
  'negotiation',
  'customer',
];

export type CategoryScheduleMode = 'continuous' | 'custom';

export interface CategorySchedule {
  mode: CategoryScheduleMode;
  windowStart?: string | null;
  windowEnd?: string | null;
  useOutsideOfficePreset?: boolean;
}

export interface AutonomyCategoryPolicy {
  enabled: boolean;
  allowLowRiskAutoExecute: boolean;
  allowMediumRiskAutoExecute: boolean;
  schedule?: CategorySchedule;
}

export type AutonomyAgentKey =
  | 'pricing'
  | 'supplier'
  | 'inventory'
  | 'promotion'
  | 'returns'
  | 'mail'
  | 'negotiation'
  | 'customer'
  | 'forecast'
  | 'catalog'
  | 'outcomes'
  | 'approvals';

export const AUTONOMY_AGENT_KEYS: AutonomyAgentKey[] = [
  'pricing',
  'supplier',
  'inventory',
  'promotion',
  'returns',
  'mail',
  'negotiation',
  'customer',
  'forecast',
  'catalog',
  'outcomes',
  'approvals',
];

export interface AgentAutonomyOverride {
  enabled: boolean;
  priority: number;
  allowLowRiskAutoExecute?: boolean | null;
  allowMediumRiskAutoExecute?: boolean | null;
}

export type RuleConditionField =
  | 'marginImpactEuro'
  | 'priceChangePct'
  | 'category'
  | 'riskClass'
  | 'agentKey'
  | 'dayOfWeek';

export type RuleOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'in';
export type RuleOutcome = 'allow_auto' | 'require_approval' | 'block';

export interface AutonomyRuleCondition {
  field: RuleConditionField;
  operator: RuleOperator;
  value: string | number | string[];
}

export interface AutonomyCustomRule {
  id: string;
  enabled: boolean;
  name: string;
  sortOrder: number;
  conditions: AutonomyRuleCondition[];
  outcome: RuleOutcome;
}

export const MAX_AUTONOMY_CUSTOM_RULES = 10;

export interface AutonomyPrefs {
  preset: AutonomyPreset;
  actionCategories: Record<AutonomyActionCategory, AutonomyCategoryPolicy>;
  agentOverrides: Partial<Record<AutonomyAgentKey, AgentAutonomyOverride>>;
  customRules: AutonomyCustomRule[];
}

export function defaultCategorySchedule(): CategorySchedule {
  return { mode: 'continuous' };
}

export function defaultCategoryPolicy(
  overrides?: Partial<AutonomyCategoryPolicy>,
): AutonomyCategoryPolicy {
  return {
    enabled: true,
    allowLowRiskAutoExecute: false,
    allowMediumRiskAutoExecute: false,
    schedule: defaultCategorySchedule(),
    ...overrides,
  };
}

export const DEFAULT_CATEGORY_POLICIES: Record<AutonomyActionCategory, AutonomyCategoryPolicy> = {
  pricing: defaultCategoryPolicy(),
  supplier: defaultCategoryPolicy(),
  inventory: defaultCategoryPolicy(),
  promotion: defaultCategoryPolicy(),
  mail: defaultCategoryPolicy({ allowLowRiskAutoExecute: true }),
  negotiation: defaultCategoryPolicy(),
  customer: defaultCategoryPolicy({ enabled: true, allowLowRiskAutoExecute: false }),
};

export const DEFAULT_AUTONOMY_PREFS: AutonomyPrefs = {
  preset: 'balanced',
  actionCategories: { ...DEFAULT_CATEGORY_POLICIES },
  agentOverrides: {},
  customRules: [],
};

function parseSchedule(raw: unknown): CategorySchedule {
  if (!raw || typeof raw !== 'object') return defaultCategorySchedule();
  const obj = raw as Record<string, unknown>;
  const mode = obj.mode === 'custom' ? 'custom' : 'continuous';
  return {
    mode,
    windowStart: typeof obj.windowStart === 'string' ? obj.windowStart : null,
    windowEnd: typeof obj.windowEnd === 'string' ? obj.windowEnd : null,
    useOutsideOfficePreset: obj.useOutsideOfficePreset === true,
  };
}

function parseCategoryPolicy(raw: unknown, fallback: AutonomyCategoryPolicy): AutonomyCategoryPolicy {
  if (!raw || typeof raw !== 'object') return { ...fallback };
  const c = raw as Record<string, unknown>;
  return {
    enabled: c.enabled !== false,
    allowLowRiskAutoExecute: c.allowLowRiskAutoExecute === true,
    allowMediumRiskAutoExecute: c.allowMediumRiskAutoExecute === true,
    schedule: parseSchedule(c.schedule ?? fallback.schedule),
  };
}

function parseAgentOverride(raw: unknown): AgentAutonomyOverride | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const priority = Number(o.priority);
  return {
    enabled: o.enabled !== false,
    priority: Number.isFinite(priority) ? Math.min(10, Math.max(1, priority)) : 5,
    allowLowRiskAutoExecute:
      o.allowLowRiskAutoExecute === null
        ? null
        : o.allowLowRiskAutoExecute === true
          ? true
          : o.allowLowRiskAutoExecute === false
            ? false
            : null,
    allowMediumRiskAutoExecute:
      o.allowMediumRiskAutoExecute === null
        ? null
        : o.allowMediumRiskAutoExecute === true
          ? true
          : o.allowMediumRiskAutoExecute === false
            ? false
            : null,
  };
}

function parseCustomRule(raw: unknown): AutonomyCustomRule | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : '';
  const name = typeof r.name === 'string' ? r.name : '';
  if (!id || !name) return null;
  const conditions: AutonomyRuleCondition[] = [];
  if (Array.isArray(r.conditions)) {
    for (const cond of r.conditions) {
      if (!cond || typeof cond !== 'object') continue;
      const c = cond as Record<string, unknown>;
      const field = c.field;
      const operator = c.operator;
      if (
        field !== 'marginImpactEuro' &&
        field !== 'priceChangePct' &&
        field !== 'category' &&
        field !== 'riskClass' &&
        field !== 'agentKey' &&
        field !== 'dayOfWeek'
      ) {
        continue;
      }
      if (
        operator !== 'gt' &&
        operator !== 'gte' &&
        operator !== 'lt' &&
        operator !== 'lte' &&
        operator !== 'eq' &&
        operator !== 'in'
      ) {
        continue;
      }
      conditions.push({
        field,
        operator,
        value: (c.value as string | number | string[]) ?? '',
      });
    }
  }
  const outcome =
    r.outcome === 'allow_auto' || r.outcome === 'block' ? r.outcome : 'require_approval';
  const sortOrder = Number(r.sortOrder);
  return {
    id,
    enabled: r.enabled !== false,
    name,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    conditions,
    outcome,
  };
}

export function parseAutonomyPrefs(raw: unknown): AutonomyPrefs {
  if (!raw || typeof raw !== 'object') {
    return {
      preset: 'balanced',
      actionCategories: { ...DEFAULT_CATEGORY_POLICIES },
      agentOverrides: {},
      customRules: [],
    };
  }
  const obj = raw as Record<string, unknown>;
  const presetRaw = obj.preset;
  const preset: AutonomyPreset =
    presetRaw === 'conservative' ||
    presetRaw === 'aggressive' ||
    presetRaw === 'custom'
      ? presetRaw
      : 'balanced';

  const actionCategories = { ...DEFAULT_CATEGORY_POLICIES };
  const cats = obj.actionCategories;
  if (cats && typeof cats === 'object') {
    for (const key of AUTONOMY_ACTION_CATEGORIES) {
      const val = (cats as Record<string, unknown>)[key];
      actionCategories[key] = parseCategoryPolicy(val, DEFAULT_CATEGORY_POLICIES[key]);
    }
  }

  const agentOverrides: Partial<Record<AutonomyAgentKey, AgentAutonomyOverride>> = {};
  const agents = obj.agentOverrides;
  if (agents && typeof agents === 'object') {
    for (const key of AUTONOMY_AGENT_KEYS) {
      const parsed = parseAgentOverride((agents as Record<string, unknown>)[key]);
      if (parsed) agentOverrides[key] = parsed;
    }
  }

  const customRules: AutonomyCustomRule[] = [];
  if (Array.isArray(obj.customRules)) {
    for (const rule of obj.customRules.slice(0, MAX_AUTONOMY_CUSTOM_RULES)) {
      const parsed = parseCustomRule(rule);
      if (parsed) customRules.push(parsed);
    }
    customRules.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return { preset, actionCategories, agentOverrides, customRules };
}

export function inferPresetFromAutonomyLevel(
  level: 'low' | 'medium' | 'high',
): AutonomyPreset {
  if (level === 'low') return 'conservative';
  if (level === 'high') return 'aggressive';
  return 'balanced';
}

export function resolveAgentOverride(
  settings: AutonomyPrefs,
  agentKey: string | undefined | null,
): AgentAutonomyOverride | null {
  if (!agentKey) return null;
  const key = agentKey as AutonomyAgentKey;
  return settings.agentOverrides[key] ?? null;
}

export function defaultAgentOverride(): AgentAutonomyOverride {
  return {
    enabled: true,
    priority: 5,
    allowLowRiskAutoExecute: null,
    allowMediumRiskAutoExecute: null,
  };
}

export function getAgentPriority(settings: AutonomyPrefs, agentKey: string): number {
  return settings.agentOverrides[agentKey as AutonomyAgentKey]?.priority ?? 5;
}
