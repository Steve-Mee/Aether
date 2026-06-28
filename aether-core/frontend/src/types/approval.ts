/**
 * Approval queue types.
 * @see GET /api/approvals, POST /api/approvals/:id/resolve, POST /api/approvals/auto-apply
 */

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface ApprovalItem {
  id: string;
  module: string;
  actionType: string;
  payload: Record<string, unknown>;
  status: ApprovalStatus | string;
  createdAt: string;
}

/** Body for POST /api/approvals/:id/resolve */
export interface ResolveApprovalInput {
  approve: boolean;
}

/** Response from POST /api/approvals/:id/resolve */
export interface ResolveApprovalResponse {
  success: boolean;
}

/** Response from POST /api/approvals/auto-apply */
export interface AutoApplyApprovalsResponse {
  applied: number;
  skipped: number;
  skippedIds?: string[];
}

export type ApprovalTab = 'all' | 'high' | 'low' | 'recent';

export type ApprovalDateFilter = 'all' | 'today' | 'week';

export type HandledOutcome = 'approved' | 'rejected';

export interface RecentlyHandledApproval {
  item: ApprovalItem;
  outcome: HandledOutcome;
  handledAt: string;
}
