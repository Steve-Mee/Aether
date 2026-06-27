import { assessApprovalAutoEligible } from '../../../shared/policy/assessApprovalAutoEligible';
import { getMerchantSettings } from '../../../shared/settings/TenantSettingsService';

export interface AutonomousRoute {
  agentKey: string;
  intent: string;
}

export function resolveAutonomousRoute(decisionType: string): AutonomousRoute | null {
  const normalized = decisionType.toLowerCase();
  if (normalized.includes('pricing') || normalized.includes('price')) {
    return { agentKey: 'pricing', intent: 'PRICING_OPTIMIZE' };
  }
  if (normalized.includes('inventory') || normalized.includes('stock')) {
    return { agentKey: 'inventory', intent: 'INVENTORY_STATUS' };
  }
  if (normalized.includes('supplier')) {
    return { agentKey: 'supplier', intent: 'SUPPLIER_MONITOR' };
  }
  if (normalized.includes('mail') || normalized.includes('email')) {
    return { agentKey: 'mail', intent: 'EMAIL_SUMMARY' };
  }
  if (normalized.includes('approval')) {
    return { agentKey: 'approvals', intent: 'APPROVAL_SUMMARY' };
  }
  return null;
}

export async function assessAutonomousRouteAllowed(params: {
  tenantId: string;
  decisionType: string;
  result: string;
  rationale?: string;
}): Promise<{
  allowed: boolean;
  reason: string;
  route: AutonomousRoute | null;
  requiresApproval: boolean;
}> {
  const route = resolveAutonomousRoute(params.decisionType);
  if (!route) {
    return {
      allowed: false,
      reason: 'No specialist route for decision type',
      route: null,
      requiresApproval: false,
    };
  }

  const settings = await getMerchantSettings(params.tenantId);
  const module = params.decisionType.split('.')[0] ?? 'autonomous-operations';
  const assessment = await assessApprovalAutoEligible({
    tenantId: params.tenantId,
    module,
    actionType: params.decisionType,
    payload: { result: params.result, rationale: params.rationale ?? '' },
  });

  if (settings.autonomyLevel === 'low' && assessment.riskClass !== 'low') {
    return {
      allowed: false,
      reason: 'Autonomie niveau laag — medium/high risk routing geblokkeerd',
      route,
      requiresApproval: true,
    };
  }

  if (!assessment.eligible) {
    return {
      allowed: false,
      reason: assessment.reason,
      route,
      requiresApproval: assessment.riskClass === 'high' || assessment.riskClass === 'medium',
    };
  }

  return {
    allowed: true,
    reason: assessment.reason,
    route,
    requiresApproval: false,
  };
}
