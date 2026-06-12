import type { ApprovalItem, HandledOutcome } from '@/types/approval';
import type { ActivityItem } from '@/types/activity';
import { FIXTURE_TIMESTAMP, FIXTURE_TIMESTAMP_OLD } from '../fixtures';

let approvalSeq = 0;

export function buildApproval(overrides: Partial<ApprovalItem> = {}): ApprovalItem {
  approvalSeq += 1;
  return {
    id: `test-approval-${approvalSeq}`,
    module: 'commerce',
    actionType: 'discount',
    payload: { sku: 'SKU-1', percent: 10 },
    status: 'pending',
    createdAt: FIXTURE_TIMESTAMP,
    ...overrides,
  };
}

/** High-risk band (refund) for approval flow tests. */
export function buildHighRiskApproval(overrides: Partial<ApprovalItem> = {}): ApprovalItem {
  return buildApproval({
    id: 'test-approval-high-risk',
    module: 'payment-fulfillment',
    actionType: 'refund',
    payload: { paymentId: 'pay-test-1', amount: 199.99, currency: 'EUR' },
    createdAt: FIXTURE_TIMESTAMP_OLD,
    ...overrides,
  });
}

export function buildLowRiskApproval(overrides: Partial<ApprovalItem> = {}): ApprovalItem {
  return buildApproval({
    id: 'test-approval-low-risk',
    module: 'aether-mail',
    actionType: 'auto_reply',
    payload: { emailId: 'e-1', subject: 'Test' },
    ...overrides,
  });
}

export function buildActivityItemFromApproval(
  item: ApprovalItem,
  outcome: HandledOutcome = 'approved',
): ActivityItem {
  return {
    id: `test-activity-approval-${item.id}`,
    source: 'demo',
    at: FIXTURE_TIMESTAMP,
    actionType: outcome === 'approved' ? 'approval_approved' : 'approval_rejected',
    actionLabel: outcome === 'approved' ? 'Goedgekeurd' : 'Afgewezen',
    description: `${item.actionType} — ${item.module}`,
    module: item.module,
    category: 'approval',
    risk: item.actionType === 'refund' ? 'high' : 'low',
    status: outcome === 'approved' ? 'approved' : 'rejected',
    executor: 'merchant',
    related: { type: 'approval', id: item.id },
    searchText: `${item.module} ${item.actionType}`.toLowerCase(),
  };
}

export function resetApprovalFactorySeq(): void {
  approvalSeq = 0;
}
