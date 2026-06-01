export type SupplierDecisionAction = 'hold' | 'negotiate' | 'switch' | 'approval_required';

export interface SupplierDecisionInput {
  changeType: 'price_change' | 'new_product' | 'stock_change';
  changePercent?: number;
}

export interface SupplierDecision {
  action: SupplierDecisionAction;
  reason: string;
  requiresApproval: boolean;
}

/**
 * Policy-driven supplier actions per plan P1.3
 */
export class SupplierDecisionEngine {
  decide(input: SupplierDecisionInput): SupplierDecision {
    if (input.changeType === 'new_product') {
      return {
        action: 'approval_required',
        reason: 'New supplier product requires merchant review',
        requiresApproval: true,
      };
    }

    const pct = Math.abs(input.changePercent ?? 0);

    if (pct >= 25) {
      return {
        action: 'approval_required',
        reason: `Price change ${pct.toFixed(1)}% exceeds 25% threshold`,
        requiresApproval: true,
      };
    }
    if (pct >= 15) {
      return {
        action: 'negotiate',
        reason: `Price change ${pct.toFixed(1)}% triggers negotiation`,
        requiresApproval: false,
      };
    }
    if (pct >= 10) {
      return {
        action: 'hold',
        reason: `Price change ${pct.toFixed(1)}% — hold and monitor`,
        requiresApproval: false,
      };
    }

    return {
      action: 'hold',
      reason: 'Change within normal band',
      requiresApproval: false,
    };
  }
}

export const supplierDecisionEngine = new SupplierDecisionEngine();
