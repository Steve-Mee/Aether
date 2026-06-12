import type { ActivityItem } from '@/types/activity';
import type { ApprovalItem, HandledOutcome, RecentlyHandledApproval } from '@/types/approval';

function outcomeFromActivity(item: ActivityItem): HandledOutcome {
  if (item.status === 'rejected' || item.actionType.includes('reject')) {
    return 'rejected';
  }
  return 'approved';
}

function toApprovalItem(
  item: ActivityItem,
  approvalId: string,
  outcome: HandledOutcome,
): ApprovalItem {
  return {
    id: approvalId,
    module: item.module,
    actionType: item.actionType,
    payload: {},
    status: outcome,
    createdAt: item.at,
  };
}

/** Map activity feed rows to recently-handled approvals for the Recent tab. */
export function mapActivityToRecentApprovals(items: ActivityItem[]): RecentlyHandledApproval[] {
  return items
    .filter((i) => i.category === 'approval')
    .map((item) => {
      const approvalId =
        item.related?.type === 'approval' ? item.related.id : item.id.replace(/^.*-/, '');
      const outcome = outcomeFromActivity(item);
      return {
        item: toApprovalItem(item, approvalId, outcome),
        outcome,
        handledAt: item.at,
      };
    })
    .sort((a, b) => new Date(b.handledAt).getTime() - new Date(a.handledAt).getTime());
}

export function mergeRecentApprovals(
  session: RecentlyHandledApproval[],
  fromActivity: RecentlyHandledApproval[],
  limit = 20,
): RecentlyHandledApproval[] {
  const sessionIds = new Set(session.map((h) => h.item.id));
  const activityOnly = fromActivity.filter((h) => !sessionIds.has(h.item.id));
  return [...session, ...activityOnly]
    .sort((a, b) => new Date(b.handledAt).getTime() - new Date(a.handledAt).getTime())
    .slice(0, limit);
}
