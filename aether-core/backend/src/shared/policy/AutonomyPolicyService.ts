import type { RiskClass } from '../../ai/orchestrator/WorkflowEngine';
import type { AutonomyActionCategory } from '../settings/autonomyTypes';
import type { MerchantSettings } from '../settings/merchantSettingsTypes';
import type { ResolveAutonomyCategoryInput } from './AutonomyActionRegistry';
import { runAutonomyGuardPipeline } from './AutonomyGuardSteps';

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

export function assessAutonomyWithTrace(input: AutonomyAssessInput): AutonomyAssessmentWithTrace {
  return runAutonomyGuardPipeline(input);
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
