import type { RiskClass } from '../../ai/orchestrator/WorkflowEngine';
import { policyEngine } from '../../ai/orchestrator/WorkflowEngine';

export interface TenantApprovalPolicy {
  autoApproveLowRisk: boolean;
  autoApproveMediumRiskMail: boolean;
  maxAutoPriceChangePct: number;
  enabled: boolean;
}

const DEFAULT_POLICY: TenantApprovalPolicy = {
  autoApproveLowRisk: true,
  autoApproveMediumRiskMail: false,
  maxAutoPriceChangePct: 5,
  enabled: true,
};

const store = new Map<string, TenantApprovalPolicy>();

export function getTenantApprovalPolicy(tenantId: string): TenantApprovalPolicy {
  return store.get(tenantId) ?? { ...DEFAULT_POLICY };
}

export function setTenantApprovalPolicy(
  tenantId: string,
  patch: Partial<TenantApprovalPolicy>
): TenantApprovalPolicy {
  const current = getTenantApprovalPolicy(tenantId);
  const next = { ...current, ...patch };
  store.set(tenantId, next);
  return next;
}

function mapModuleToAction(module: string, actionType: string): string {
  if (module === 'aether-mail') return 'email.auto_reply';
  if (/price|prijs/.test(actionType)) return 'price.change';
  if (module === 'supplier-intelligence') return 'supplier.monitor';
  if (module === 'payment-fulfillment') return 'payment.refund';
  return actionType;
}

export function assessApprovalAutoEligible(params: {
  tenantId: string;
  module: string;
  actionType: string;
  payload: Record<string, unknown>;
}): { eligible: boolean; reason: string; riskClass: RiskClass } {
  const policy = getTenantApprovalPolicy(params.tenantId);
  if (!policy.enabled) {
    return { eligible: false, reason: 'Auto-approve uitgeschakeld', riskClass: 'medium' };
  }

  const action = mapModuleToAction(params.module, params.actionType);
  const decision = policyEngine.evaluate(action, params.payload);

  if (decision.riskClass === 'high') {
    return { eligible: false, reason: decision.reason, riskClass: 'high' };
  }

  if (decision.riskClass === 'low' && policy.autoApproveLowRisk && !decision.requiresApproval) {
    return { eligible: true, reason: 'Laag risico — policy staat auto-goedkeuring toe', riskClass: 'low' };
  }

  if (
    params.module === 'aether-mail' &&
    decision.riskClass === 'medium' &&
    policy.autoApproveMediumRiskMail
  ) {
    return { eligible: true, reason: 'Mail medium-risico — policy override', riskClass: 'medium' };
  }

  const pct = Number(params.payload.percentage ?? params.payload.priceChangePct ?? 0);
  if (
    /price|prijs/.test(params.actionType) &&
    pct > 0 &&
    pct <= policy.maxAutoPriceChangePct &&
    policy.autoApproveLowRisk
  ) {
    return {
      eligible: true,
      reason: `Prijs ≤${policy.maxAutoPriceChangePct}% — binnen drempel`,
      riskClass: 'medium',
    };
  }

  return { eligible: false, reason: decision.reason, riskClass: decision.riskClass };
}
