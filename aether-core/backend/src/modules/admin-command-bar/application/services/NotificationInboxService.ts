import { countPendingApprovals } from '../../../../shared/approval/approvalService';
import {
  buildActivityFeed,
  resolveActivitySince,
  type ActivityFeedItem,
} from './ActivityFeedService';
import { getNotificationStateMap } from './NotificationReadStateService';

export type NotificationSeverity = 'info' | 'warning' | 'action';

export type NotificationCategory =
  | 'autonomous_low_risk'
  | 'high_risk_approval'
  | 'supplier_change'
  | 'weekly_digest'
  | 'general';

export interface MerchantNotification {
  id: string;
  title: string;
  body: string;
  severity: NotificationSeverity;
  read: boolean;
  createdAt: string;
  href?: string;
  actionLabel?: string;
  source: 'system';
  category?: NotificationCategory;
}

export function mapActivityToNotification(item: ActivityFeedItem): MerchantNotification | null {
  if (item.actionType === 'ui.navigation') return null;

  const severity: NotificationSeverity =
    item.status === 'pending' || item.risk === 'high'
      ? 'action'
      : item.status === 'rejected'
        ? 'warning'
        : 'info';

  let href: string | undefined;
  let category: NotificationCategory = 'general';

  if (item.related?.type === 'approval' || item.module.includes('approval')) {
    href = '/approvals';
    category = 'high_risk_approval';
  } else if (item.module.includes('supplier')) {
    href = '/suppliers';
    category = 'supplier_change';
  } else if (item.actionType.includes('autonomy') || item.module.includes('autonomy')) {
    category = 'autonomous_low_risk';
  }

  return {
    id: `notif-${item.id}`,
    title: item.actionLabel,
    body: item.description,
    severity,
    read: false,
    createdAt: item.at,
    href,
    actionLabel: href ? 'Bekijk' : undefined,
    source: 'system',
    category,
  };
}

export async function buildNotificationInbox(
  tenantId: string,
  actorId: string,
  limit = 30
): Promise<{ notifications: MerchantNotification[] }> {
  const cappedLimit = Math.min(Math.max(limit, 1), 50);
  const since = resolveActivitySince(7);

  const [feed, pendingCount, state] = await Promise.all([
    buildActivityFeed({ tenantId, since, limit: cappedLimit * 2 }),
    countPendingApprovals(tenantId),
    getNotificationStateMap(tenantId, actorId),
  ]);

  const notifications: MerchantNotification[] = [];

  if (pendingCount > 0) {
    const id = 'inbox-pending-approvals';
    if (!state.dismissedIds.has(id)) {
      notifications.push({
        id,
        title: 'Goedkeuringen wachten',
        body:
          pendingCount === 1
            ? '1 beslissing wacht op jou'
            : `${pendingCount} beslissingen wachten op jou`,
        severity: 'action',
        read: state.readIds.has(id),
        createdAt: new Date().toISOString(),
        href: '/approvals',
        actionLabel: 'Bekijk goedkeuringen',
        source: 'system',
        category: 'high_risk_approval',
      });
    }
  }

  for (const item of feed.items) {
    const mapped = mapActivityToNotification(item);
    if (!mapped || state.dismissedIds.has(mapped.id)) continue;
    notifications.push({
      ...mapped,
      read: state.readIds.has(mapped.id),
    });
    if (notifications.length >= cappedLimit) break;
  }

  return { notifications: notifications.slice(0, cappedLimit) };
}
