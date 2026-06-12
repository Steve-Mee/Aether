import type { RiskClass } from '../../ai/orchestrator/WorkflowEngine';
import { policyEngine } from '../../ai/orchestrator/WorkflowEngine';
import {
  extractMarginImpact,
  isAutonomousWindowOpen,
} from '../settings/merchantSettingsTypes';
import { getMerchantSettings } from '../settings/TenantSettingsService';

export interface TenantApprovalPolicy {
  autoApproveLowRisk: boolean;
  autoApproveMediumRiskMail: boolean;
  maxAutoPriceChangePct: number;
  enabled: boolean;
}

function mapModuleToAction(module: string, actionType: string): string {
  if (module === 'aether-mail') return 'email.auto_reply';
  if (/price|prijs/.test(actionType)) return 'price.change';
  if (module === 'supplier-intelligence') return 'supplier.monitor';
  if (module === 'payment-fulfillment') return 'payment.refund';
  return actionType;
}

export async function assessApprovalAutoEligible(params: {
  tenantId: string;
  module: string;
  actionType: string;
  payload: Record<string, unknown>;
}): Promise<{ eligible: boolean; reason: string; riskClass: RiskClass }> {
  const settings = await getMerchantSettings(params.tenantId);
  const policy: TenantApprovalPolicy = {
    autoApproveLowRisk: settings.autoApproveLowRisk,
    autoApproveMediumRiskMail: settings.autoApproveMediumRiskMail,
    maxAutoPriceChangePct: settings.maxAutoPriceChangePct,
    enabled: settings.policyEnabled,
  };

  if (!policy.enabled) {
    return { eligible: false, reason: 'Auto-approve uitgeschakeld', riskClass: 'medium' };
  }

  if (!isAutonomousWindowOpen(settings)) {
    return { eligible: false, reason: 'Buiten auto-run venster', riskClass: 'medium' };
  }

  const marginImpact = extractMarginImpact(params.payload);
  if (marginImpact > settings.maxMarginImpactEuro) {
    return {
      eligible: false,
      reason: `Marge-impact €${marginImpact} boven drempel €${settings.maxMarginImpactEuro}`,
      riskClass: 'high',
    };
  }

  const action = mapModuleToAction(params.module, params.actionType);
  const decision = policyEngine.evaluate(action, params.payload);

  if (decision.riskClass === 'high') {
    return { eligible: false, reason: decision.reason, riskClass: 'high' };
  }

  if (settings.autonomyLevel === 'low' && decision.riskClass !== 'low') {
    return { eligible: false, reason: 'Autonomie niveau laag — goedkeuring vereist', riskClass: decision.riskClass };
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

  if (
    settings.autonomyLevel === 'high' &&
    decision.riskClass === 'medium' &&
    policy.autoApproveLowRisk &&
    !decision.requiresApproval
  ) {
    return { eligible: true, reason: 'Hoog autonomie niveau — medium-risico toegestaan', riskClass: 'medium' };
  }

  return { eligible: false, reason: decision.reason, riskClass: decision.riskClass };
}
