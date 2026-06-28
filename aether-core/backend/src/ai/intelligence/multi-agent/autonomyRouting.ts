import { assessAutonomyForTenant } from '../../../shared/policy/AutonomyPolicyService';
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
  reasonCode?: string;
  category?: string | null;
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

  const module = params.decisionType.split('.')[0] ?? 'autonomous-operations';
  const assessment = await assessAutonomyForTenant({
    tenantId: params.tenantId,
    module,
    actionType: params.decisionType,
    agentKey: route.agentKey,
    payload: { result: params.result, rationale: params.rationale ?? '' },
    getSettings: getMerchantSettings,
  });

  if (!assessment.eligible) {
    return {
      allowed: false,
      reason: assessment.reason,
      route,
      requiresApproval:
        assessment.executionMode === 'approval_required' ||
        assessment.riskClass === 'high' ||
        assessment.riskClass === 'medium',
      reasonCode: assessment.reasonCode,
      category: assessment.category,
    };
  }

  return {
    allowed: true,
    reason: assessment.reason,
    route,
    requiresApproval: false,
    reasonCode: assessment.reasonCode,
    category: assessment.category,
  };
}
