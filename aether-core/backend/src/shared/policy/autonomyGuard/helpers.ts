import type { RiskClass } from '../../../ai/orchestrator/WorkflowEngine';
import { policyEngine } from '../../../ai/orchestrator/WorkflowEngine';
import type {
  AutonomyActionCategory,
  AgentAutonomyOverride,
} from '../../settings/autonomyTypes';
import { resolveAgentOverride } from '../../settings/autonomyTypes';
import type { MerchantSettings } from '../../settings/merchantSettingsTypes';
import { extractMarginImpact } from '../../settings/merchantSettingsTypes';
import { resolveAutonomyCategory } from '../AutonomyActionRegistry';
import type {
  AutonomyAssessInput,
  AutonomyAssessment,
  AutonomyTraceStep,
} from '../AutonomyPolicyService';
import type {
  AutonomyGuardContext,
  AutonomyGuardStepResult,
} from './types';

export function mapModuleToAction(module: string, actionType: string): string {
  if (module === 'aether-mail') return 'email.auto_reply';
  if (/price|prijs/.test(actionType)) return 'price.change';
  if (module === 'supplier-intelligence') return 'supplier.monitor';
  if (module === 'payment-fulfillment') return 'payment.refund';
  return actionType;
}

export function categoryPolicy(
  settings: MerchantSettings,
  category: AutonomyActionCategory | null
) {
  if (!category) return null;
  return settings.autonomyPrefs?.actionCategories?.[category] ?? null;
}

export function toAssessment(
  partial: Omit<AutonomyAssessment, 'guardrails'>
): AutonomyAssessment {
  return { ...partial, guardrails: { highRiskAlwaysApproval: true } };
}

export function pushTrace(
  trace: AutonomyTraceStep[],
  step: string,
  passed: boolean,
  reason?: string,
  reasonCode?: string
): void {
  trace.push({ step, passed, reason, reasonCode });
}

export function resolveEffectiveAutoExecute(
  catPolicy: { allowLowRiskAutoExecute: boolean; allowMediumRiskAutoExecute: boolean } | null,
  agentOv: AgentAutonomyOverride | null,
  riskClass: RiskClass
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

export function done(
  ctx: AutonomyGuardContext,
  partial: Omit<AutonomyAssessment, 'guardrails'>,
  matchedRuleId?: string
): AutonomyGuardStepResult {
  const assessment = toAssessment(partial);
  return {
    kind: 'done',
    assessment: matchedRuleId
      ? { ...assessment, trace: ctx.trace, matchedRuleId }
      : { ...assessment, trace: ctx.trace },
  };
}

export function buildGuardContext(input: AutonomyAssessInput): AutonomyGuardContext {
  const { settings } = input;
  const payload = input.payload ?? {};
  const now = input.now ?? new Date();
  const trace: AutonomyTraceStep[] = [];

  const mapping = resolveAutonomyCategory(input);
  const category = mapping?.category ?? null;
  pushTrace(trace, 'category_resolve', true, category ?? 'none');

  const module = input.module ?? 'autonomous-operations';
  const actionType = input.actionType ?? input.tool ?? input.intent ?? '';
  const action = mapModuleToAction(module, actionType);
  const decision = policyEngine.evaluate(action, payload);
  const riskClass: RiskClass = input.riskClass ?? decision.riskClass;
  const catPolicy = categoryPolicy(settings, category);
  const agentOv = resolveAgentOverride(settings.autonomyPrefs, input.agentKey) ?? null;
  const marginImpact = extractMarginImpact(payload);
  const pct = Number(payload.percentage ?? payload.priceChangePct ?? 0);
  const effective = resolveEffectiveAutoExecute(catPolicy, agentOv, riskClass);

  return {
    input,
    settings,
    payload,
    now,
    trace,
    category,
    module,
    actionType,
    action,
    decision,
    riskClass,
    catPolicy,
    agentOv,
    marginImpact,
    pct,
    effective,
  };
}
