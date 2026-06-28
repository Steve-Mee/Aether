import type { RiskClass } from '../../ai/orchestrator/WorkflowEngine';
import { policyEngine } from '../../ai/orchestrator/WorkflowEngine';
import type {
  AutonomyActionCategory,
  AgentAutonomyOverride,
} from '../settings/autonomyTypes';
import {
  defaultAgentOverride,
  resolveAgentOverride,
} from '../settings/autonomyTypes';
import type { MerchantSettings } from '../settings/merchantSettingsTypes';
import {
  extractMarginImpact,
  isAutonomousWindowOpen,
} from '../settings/merchantSettingsTypes';
import { isCategoryWindowOpen } from '../settings/categoryWindow';
import {
  resolveAutonomyCategory,
  type ResolveAutonomyCategoryInput,
} from './AutonomyActionRegistry';
import { matchAutonomyRules } from './AutonomyRuleEngine';

export type AutonomyExecutionMode =
  | 'autonomous'
  | 'approval_required'
  | 'inform_only'
  | 'blocked';

export type AutonomyReasonCode =
  | 'high_risk_guard'
  | 'policy_disabled'
  | 'category_disabled'
  | 'outside_window'
  | 'category_outside_window'
  | 'margin_exceeded'
  | 'price_pct_exceeded'
  | 'autonomy_level_low'
  | 'category_low_risk_denied'
  | 'category_medium_risk_denied'
  | 'agent_disabled'
  | 'agent_low_risk_denied'
  | 'agent_medium_risk_denied'
  | 'custom_rule_allow'
  | 'custom_rule_block'
  | 'custom_rule_deferred'
  | 'low_risk_allowed'
  | 'medium_risk_allowed'
  | 'mail_medium_override'
  | 'price_within_threshold'
  | 'high_autonomy_medium'
  | 'default_denied';

export interface AutonomyTraceStep {
  step: string;
  passed: boolean;
  reason?: string;
  reasonCode?: string;
}

export interface AutonomyAssessment {
  executionMode: AutonomyExecutionMode;
  eligible: boolean;
  reason: string;
  reasonCode: AutonomyReasonCode;
  riskClass: RiskClass;
  category: AutonomyActionCategory | null;
  guardrails: { highRiskAlwaysApproval: true };
}

export interface AutonomyAssessmentWithTrace extends AutonomyAssessment {
  trace: AutonomyTraceStep[];
  matchedRuleId?: string;
}

export interface AutonomyAssessInput extends ResolveAutonomyCategoryInput {
  settings: MerchantSettings;
  payload?: Record<string, unknown>;
  riskClass?: RiskClass;
  now?: Date;
}

function mapModuleToAction(module: string, actionType: string): string {
  if (module === 'aether-mail') return 'email.auto_reply';
  if (/price|prijs/.test(actionType)) return 'price.change';
  if (module === 'supplier-intelligence') return 'supplier.monitor';
  if (module === 'payment-fulfillment') return 'payment.refund';
  return actionType;
}

function categoryPolicy(settings: MerchantSettings, category: AutonomyActionCategory | null) {
  if (!category) return null;
  return settings.autonomyPrefs?.actionCategories?.[category] ?? null;
}

function toAssessment(
  partial: Omit<AutonomyAssessment, 'guardrails'>,
): AutonomyAssessment {
  return { ...partial, guardrails: { highRiskAlwaysApproval: true } };
}

function pushTrace(
  trace: AutonomyTraceStep[],
  step: string,
  passed: boolean,
  reason?: string,
  reasonCode?: string,
): void {
  trace.push({ step, passed, reason, reasonCode });
}

function resolveEffectiveAutoExecute(
  catPolicy: { allowLowRiskAutoExecute: boolean; allowMediumRiskAutoExecute: boolean } | null,
  agentOv: AgentAutonomyOverride | null,
  riskClass: RiskClass,
): { allowLow: boolean; allowMedium: boolean } {
  const catLow = catPolicy?.allowLowRiskAutoExecute ?? false;
  const catMedium = catPolicy?.allowMediumRiskAutoExecute ?? false;
  const agentLow =
    agentOv?.allowLowRiskAutoExecute === null || agentOv?.allowLowRiskAutoExecute === undefined
      ? catLow
      : agentOv.allowLowRiskAutoExecute;
  const agentMedium =
    agentOv?.allowMediumRiskAutoExecute === null || agentOv?.allowMediumRiskAutoExecute === undefined
      ? catMedium
      : agentOv.allowMediumRiskAutoExecute;
  return {
    allowLow: riskClass === 'low' ? agentLow : catLow,
    allowMedium: riskClass === 'medium' ? agentMedium : catMedium,
  };
}

export function assessAutonomyWithTrace(input: AutonomyAssessInput): AutonomyAssessmentWithTrace {
  const trace: AutonomyTraceStep[] = [];
  const { settings } = input;
  const payload = input.payload ?? {};
  const now = input.now ?? new Date();

  const mapping = resolveAutonomyCategory(input);
  const category = mapping?.category ?? null;
  pushTrace(trace, 'category_resolve', true, category ?? 'none');

  const module = input.module ?? 'autonomous-operations';
  const actionType = input.actionType ?? input.tool ?? input.intent ?? '';
  const action = mapModuleToAction(module, actionType);
  const decision = policyEngine.evaluate(action, payload);
  const riskClass: RiskClass = input.riskClass ?? decision.riskClass;

  if (riskClass === 'high' || decision.riskClass === 'high') {
    pushTrace(trace, 'high_risk_guard', false, 'Hoog risico — goedkeuring altijd vereist', 'high_risk_guard');
    const assessment = toAssessment({
      executionMode: 'approval_required',
      eligible: false,
      reason: 'Hoog risico — goedkeuring altijd vereist',
      reasonCode: 'high_risk_guard',
      riskClass: 'high',
      category,
    });
    return { ...assessment, trace };
  }
  pushTrace(trace, 'high_risk_guard', true);

  if (!settings.policyEnabled) {
    pushTrace(trace, 'policy_enabled', false, 'Auto-approve uitgeschakeld', 'policy_disabled');
    const assessment = toAssessment({
      executionMode: 'approval_required',
      eligible: false,
      reason: 'Auto-approve uitgeschakeld',
      reasonCode: 'policy_disabled',
      riskClass,
      category,
    });
    return { ...assessment, trace };
  }
  pushTrace(trace, 'policy_enabled', true);

  const catPolicy = categoryPolicy(settings, category);
  if (catPolicy && !catPolicy.enabled) {
    pushTrace(trace, 'category_enabled', false, `Categorie ${category} is uitgeschakeld`, 'category_disabled');
    const assessment = toAssessment({
      executionMode: 'blocked',
      eligible: false,
      reason: `Categorie ${category} is uitgeschakeld`,
      reasonCode: 'category_disabled',
      riskClass,
      category,
    });
    return { ...assessment, trace };
  }
  pushTrace(trace, 'category_enabled', true);

  const agentOv = resolveAgentOverride(settings.autonomyPrefs, input.agentKey) ?? null;
  if (agentOv && !agentOv.enabled) {
    pushTrace(trace, 'agent_enabled', false, `Agent ${input.agentKey} is uitgeschakeld`, 'agent_disabled');
    const assessment = toAssessment({
      executionMode: 'blocked',
      eligible: false,
      reason: `Agent ${input.agentKey} is uitgeschakeld voor autonome acties`,
      reasonCode: 'agent_disabled',
      riskClass,
      category,
    });
    return { ...assessment, trace };
  }
  pushTrace(trace, 'agent_enabled', true, agentOv ? `priority ${agentOv.priority}` : 'default');

  if (!isAutonomousWindowOpen(settings, now)) {
    pushTrace(trace, 'global_window', false, 'Buiten auto-run venster', 'outside_window');
    const assessment = toAssessment({
      executionMode: 'inform_only',
      eligible: false,
      reason: 'Buiten auto-run venster',
      reasonCode: 'outside_window',
      riskClass,
      category,
    });
    return { ...assessment, trace };
  }
  pushTrace(trace, 'global_window', true);

  if (category && !isCategoryWindowOpen(category, settings, now)) {
    pushTrace(trace, 'category_window', false, `Categorie ${category} buiten schema`, 'category_outside_window');
    const assessment = toAssessment({
      executionMode: 'inform_only',
      eligible: false,
      reason: `Categorie ${category} is buiten het ingestelde tijdvenster`,
      reasonCode: 'category_outside_window',
      riskClass,
      category,
    });
    return { ...assessment, trace };
  }
  pushTrace(trace, 'category_window', true, category ? 'continuous or open' : 'n/a');

  const marginImpact = extractMarginImpact(payload);
  const pct = Number(payload.percentage ?? payload.priceChangePct ?? 0);

  const matchedRule = matchAutonomyRules(settings.autonomyPrefs?.customRules ?? [], {
    marginImpactEuro: marginImpact,
    priceChangePct: pct,
    category,
    riskClass,
    agentKey: input.agentKey,
    now,
  });

  if (matchedRule) {
    pushTrace(
      trace,
      'custom_rule',
      true,
      `Regel "${matchedRule.rule.name}" (${matchedRule.outcome})`,
      matchedRule.outcome === 'allow_auto'
        ? 'custom_rule_allow'
        : matchedRule.outcome === 'block'
          ? 'custom_rule_block'
          : 'custom_rule_deferred',
    );
    if (matchedRule.outcome === 'allow_auto') {
      const assessment = toAssessment({
        executionMode: 'autonomous',
        eligible: true,
        reason: `Custom regel: ${matchedRule.rule.name}`,
        reasonCode: 'custom_rule_allow',
        riskClass,
        category,
      });
      return { ...assessment, trace, matchedRuleId: matchedRule.rule.id };
    }
    if (matchedRule.outcome === 'block') {
      const assessment = toAssessment({
        executionMode: 'blocked',
        eligible: false,
        reason: `Custom regel blokkeert: ${matchedRule.rule.name}`,
        reasonCode: 'custom_rule_block',
        riskClass,
        category,
      });
      return { ...assessment, trace, matchedRuleId: matchedRule.rule.id };
    }
    const assessment = toAssessment({
      executionMode: 'approval_required',
      eligible: false,
      reason: `Custom regel vereist goedkeuring: ${matchedRule.rule.name}`,
      reasonCode: 'custom_rule_deferred',
      riskClass,
      category,
    });
    return { ...assessment, trace, matchedRuleId: matchedRule.rule.id };
  }
  pushTrace(trace, 'custom_rule', true, 'Geen regel van toepassing');

  if (marginImpact > settings.maxMarginImpactEuro) {
    pushTrace(trace, 'margin_threshold', false, `€${marginImpact} > €${settings.maxMarginImpactEuro}`, 'margin_exceeded');
    const assessment = toAssessment({
      executionMode: 'approval_required',
      eligible: false,
      reason: `Marge-impact €${marginImpact} boven drempel €${settings.maxMarginImpactEuro}`,
      reasonCode: 'margin_exceeded',
      riskClass: 'high',
      category,
    });
    return { ...assessment, trace };
  }
  pushTrace(trace, 'margin_threshold', true);

  if (/price|prijs/.test(actionType) && pct > 0 && pct > settings.maxAutoPriceChangePct) {
    pushTrace(trace, 'price_pct_threshold', false, `${pct}% > ${settings.maxAutoPriceChangePct}%`, 'price_pct_exceeded');
    const assessment = toAssessment({
      executionMode: 'approval_required',
      eligible: false,
      reason: `Prijswijziging ${pct}% boven drempel ${settings.maxAutoPriceChangePct}%`,
      reasonCode: 'price_pct_exceeded',
      riskClass: 'medium',
      category,
    });
    return { ...assessment, trace };
  }
  pushTrace(trace, 'price_pct_threshold', true);

  if (settings.autonomyLevel === 'low' && riskClass !== 'low') {
    pushTrace(trace, 'autonomy_level', false, 'Niveau laag', 'autonomy_level_low');
    const assessment = toAssessment({
      executionMode: 'approval_required',
      eligible: false,
      reason: 'Autonomie niveau laag — goedkeuring vereist',
      reasonCode: 'autonomy_level_low',
      riskClass,
      category,
    });
    return { ...assessment, trace };
  }
  pushTrace(trace, 'autonomy_level', true);

  const effective = resolveEffectiveAutoExecute(catPolicy, agentOv, riskClass);

  if (riskClass === 'low' && settings.autoApproveLowRisk && !decision.requiresApproval) {
    if (!effective.allowLow) {
      const code =
        agentOv?.allowLowRiskAutoExecute === false ? 'agent_low_risk_denied' : 'category_low_risk_denied';
      pushTrace(trace, 'low_risk_auto', false, 'Low-risk auto-execute niet toegestaan', code);
      const assessment = toAssessment({
        executionMode: 'approval_required',
        eligible: false,
        reason:
          code === 'agent_low_risk_denied'
            ? `Agent ${input.agentKey} staat geen low-risk auto-execute toe`
            : `Categorie ${category} staat geen low-risk auto-execute toe`,
        reasonCode: code,
        riskClass,
        category,
      });
      return { ...assessment, trace };
    }
    pushTrace(trace, 'low_risk_auto', true);
    const assessment = toAssessment({
      executionMode: 'autonomous',
      eligible: true,
      reason: 'Laag risico — policy staat auto-goedkeuring toe',
      reasonCode: 'low_risk_allowed',
      riskClass: 'low',
      category,
    });
    return { ...assessment, trace };
  }

  if (module === 'aether-mail' && riskClass === 'medium' && settings.autoApproveMediumRiskMail) {
    pushTrace(trace, 'mail_medium_override', true);
    const assessment = toAssessment({
      executionMode: 'autonomous',
      eligible: true,
      reason: 'Mail medium-risico — policy override',
      reasonCode: 'mail_medium_override',
      riskClass: 'medium',
      category,
    });
    return { ...assessment, trace };
  }

  if (
    /price|prijs/.test(actionType) &&
    pct > 0 &&
    pct <= settings.maxAutoPriceChangePct &&
    settings.autoApproveLowRisk
  ) {
    if (!effective.allowLow && !effective.allowMedium) {
      pushTrace(trace, 'category_medium_auto', false, 'Prijs categorie medium denied', 'category_medium_risk_denied');
      const assessment = toAssessment({
        executionMode: 'approval_required',
        eligible: false,
        reason: `Prijsaanpassingen vereisen goedkeuring (categorie ${category})`,
        reasonCode: 'category_medium_risk_denied',
        riskClass: 'medium',
        category,
      });
      return { ...assessment, trace };
    }
    pushTrace(trace, 'price_within_threshold', true);
    const assessment = toAssessment({
      executionMode: 'autonomous',
      eligible: true,
      reason: `Prijs ≤${settings.maxAutoPriceChangePct}% — binnen drempel`,
      reasonCode: 'price_within_threshold',
      riskClass: 'medium',
      category,
    });
    return { ...assessment, trace };
  }

  if (
    settings.autonomyLevel === 'high' &&
    riskClass === 'medium' &&
    settings.autoApproveLowRisk &&
    !decision.requiresApproval
  ) {
    if (!effective.allowMedium && !effective.allowLow) {
      pushTrace(trace, 'category_medium_auto', false, 'Medium niet toegestaan', 'category_medium_risk_denied');
      const assessment = toAssessment({
        executionMode: 'approval_required',
        eligible: false,
        reason: `Medium-risico niet toegestaan voor categorie ${category}`,
        reasonCode: 'category_medium_risk_denied',
        riskClass: 'medium',
        category,
      });
      return { ...assessment, trace };
    }
    pushTrace(trace, 'high_autonomy_medium', true);
    const assessment = toAssessment({
      executionMode: 'autonomous',
      eligible: true,
      reason: 'Hoog autonomie niveau — medium-risico toegestaan',
      reasonCode: 'high_autonomy_medium',
      riskClass: 'medium',
      category,
    });
    return { ...assessment, trace };
  }

  pushTrace(trace, 'default', false, decision.reason, 'default_denied');
  const assessment = toAssessment({
    executionMode: decision.requiresApproval ? 'approval_required' : 'inform_only',
    eligible: false,
    reason: decision.reason,
    reasonCode: 'default_denied',
    riskClass,
    category,
  });
  return { ...assessment, trace };
}

export function assessAutonomy(input: AutonomyAssessInput): AutonomyAssessment {
  const { trace: _trace, matchedRuleId: _rule, ...assessment } = assessAutonomyWithTrace(input);
  return assessment;
}

export async function assessAutonomyForTenant(params: {
  tenantId: string;
  module: string;
  actionType: string;
  payload?: Record<string, unknown>;
  tool?: string;
  intent?: string;
  triggerId?: string;
  agentKey?: string;
  riskClass?: RiskClass;
  now?: Date;
  getSettings: (tenantId: string) => Promise<MerchantSettings>;
}): Promise<AutonomyAssessment> {
  const settings = await params.getSettings(params.tenantId);
  return assessAutonomy({
    settings,
    module: params.module,
    actionType: params.actionType,
    payload: params.payload,
    tool: params.tool,
    intent: params.intent,
    triggerId: params.triggerId,
    agentKey: params.agentKey,
    riskClass: params.riskClass,
    now: params.now,
  });
}

export async function assessAutonomyWithTraceForTenant(params: {
  tenantId: string;
  module: string;
  actionType: string;
  payload?: Record<string, unknown>;
  tool?: string;
  intent?: string;
  triggerId?: string;
  agentKey?: string;
  riskClass?: RiskClass;
  now?: Date;
  getSettings: (tenantId: string) => Promise<MerchantSettings>;
}): Promise<AutonomyAssessmentWithTrace> {
  const settings = await params.getSettings(params.tenantId);
  return assessAutonomyWithTrace({
    settings,
    module: params.module,
    actionType: params.actionType,
    payload: params.payload,
    tool: params.tool,
    intent: params.intent,
    triggerId: params.triggerId,
    agentKey: params.agentKey,
    riskClass: params.riskClass,
    now: params.now,
  });
}

export { defaultAgentOverride, getAgentPriority } from '../settings/autonomyTypes';
