import {
  dispatchActivityItem,
  dispatchNotification,
  dispatchSupplierChange,
  type SupplierChangeDetail,
} from '@/lib/aetherLiveBus';
import { t } from '@/lib/i18n';
import type { ApprovalItem, HandledOutcome } from '@/types/approval';
import type { ActivityItem } from '@/types/activity';
import type { CommandResult } from '@/types/command';
import { enrichApproval } from '@/lib/approvalPresentation';

function buildApprovalActivityItem(item: ApprovalItem, outcome: HandledOutcome): ActivityItem {
  const enriched = enrichApproval(item);
  return {
    id: `session-approval-${item.id}-${Date.now()}`,
    source: 'demo',
    at: new Date().toISOString(),
    actionType: outcome === 'approved' ? 'approval_approved' : 'approval_rejected',
    actionLabel:
      outcome === 'approved' ? t('activity.status.approved') : t('activity.status.rejected'),
    description: enriched.title,
    module: item.module,
    category: 'approval',
    risk: enriched.riskBand === 'high' ? 'high' : enriched.riskBand === 'medium' ? 'low' : 'low',
    status: outcome === 'approved' ? 'approved' : 'rejected',
    executor: 'merchant',
    impact: enriched.impact ? { label: 'Impact', value: enriched.impact } : undefined,
    related: { type: 'approval', id: item.id },
    searchText: `${enriched.title} ${item.module}`.toLowerCase(),
  };
}

function buildCommandActivityItem(result: CommandResult): ActivityItem {
  const cmd = result.originalCommand ?? result.parsedIntent;
  return {
    id: `session-command-${result.commandId ?? Date.now()}`,
    source: 'demo',
    at: result.timestamp ?? new Date().toISOString(),
    actionType: 'command_executed',
    actionLabel: t('activity.category.command'),
    description: result.result || cmd,
    module: 'admin-command-bar',
    category: 'command',
    risk: (result.confidence ?? 0) >= 0.85 ? 'low' : 'low',
    status: result.success ? 'autonomous' : 'info',
    executor: 'merchant',
    confidence: result.confidence,
    rationale: result.result,
    searchText: `${cmd} ${result.result}`.toLowerCase(),
  };
}

/** Instant cross-screen feedback after approval resolve (supplements query invalidation). */
export function afterApprovalResolved(
  item: ApprovalItem,
  outcome: HandledOutcome,
  options?: { skipAnnounce?: boolean },
): void {
  const enriched = enrichApproval(item);
  dispatchActivityItem(buildApprovalActivityItem(item, outcome));
  dispatchNotification({
    title:
      outcome === 'approved' ? t('approvals.success.approved') : t('approvals.success.rejected'),
    body: enriched.title,
    severity: 'info',
    href: '/approvals',
    source: 'user',
    category: 'high_risk_approval',
    skipAnnounce: options?.skipAnnounce,
  });
}

/** Instant feedback after supplier monitor/sync (supplements query invalidation). */
export function afterSupplierSynced(
  supplierId: string,
  detail?: Partial<SupplierChangeDetail> & { supplierName?: string },
): void {
  const now = new Date().toISOString();
  dispatchSupplierChange({
    supplierId,
    hasRecentPriceDrop: detail?.hasRecentPriceDrop,
    recentChangeCountDelta: detail?.recentChangeCountDelta ?? 1,
    lastSyncAt: detail?.lastSyncAt ?? now,
  });
  dispatchNotification({
    title: t('liveDemo.sync.title'),
    body: detail?.supplierName
      ? `${detail.supplierName} — ${t('liveDemo.sync.body')}`
      : t('liveDemo.sync.body'),
    severity: 'info',
    href: '/suppliers',
    source: 'system',
    category: 'supplier_change',
  });
}

/** Instant feedback after NL command execute (supplements query invalidation). */
export function afterCommandExecuted(result: CommandResult): void {
  if (!result.success) return;
  dispatchActivityItem(buildCommandActivityItem(result));
}
