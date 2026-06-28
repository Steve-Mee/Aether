import { countPendingApprovals } from '../../../../shared/approval/approvalService';
import { prisma } from '../../../../shared/prisma/client';
import { getMerchantSettings } from '../../../../shared/settings/TenantSettingsService';
import {
  buildActivityFeed,
  resolveActivitySince,
} from './ActivityFeedService';
import { getNotificationStateMap } from './NotificationReadStateService';
import {
  mapActivityToNotification,
  mapOverviewFeedItemToNotification,
  mapPendingApprovalsNotification,
  mapProactiveRowToNotification,
} from './notifications/notificationMappers';
import { isInAppNotificationEnabled } from './notifications/notificationPrefUtils';
import type { MerchantNotification } from './notifications/notificationTypes';
import {
  isNotificationMaterializeEnabled,
  isVirtualInboxFallbackEnabled,
  NOTIFICATION_HISTORY_DAYS,
} from './notifications/notificationConfig';
import {
  countUnreadMaterialized,
  decodeNotificationCursor,
  encodeNotificationCursor,
  listGroupedMembers,
  listMaterializedNotifications,
  type NotificationCursor,
} from './notifications/NotificationRepository';
import { materializeNotification } from './notifications/NotificationWriter';

export type {
  MerchantNotification,
  NotificationCategory,
  NotificationKind,
  NotificationSeverity,
} from './notifications/notificationTypes';

export { mapActivityToNotification } from './notifications/notificationMappers';

const FEED_NOTIFICATION_KINDS = ['goal_snapshot', 'goal_completed', 'agent_handoff'] as const;

export interface NotificationInboxResponse {
  notifications: MerchantNotification[];
  nextCursor?: string | null;
  hasMore?: boolean;
  unreadCount?: number;
}

async function buildVirtualNotificationInbox(
  tenantId: string,
  state: { readIds: Set<string>; dismissedIds: Set<string> },
  prefs: import('../../../../shared/settings/merchantSettingsTypes').NotificationPrefs,
  cappedLimit: number,
): Promise<MerchantNotification[]> {
  const since = resolveActivitySince(7);

  const [feed, pendingCount, proactiveRows, feedRows] = await Promise.all([
    buildActivityFeed({ tenantId, since, limit: cappedLimit * 2 }),
    countPendingApprovals(tenantId),
    prisma.proactiveSuggestion.findMany({
      where: { tenantId, status: 'active' },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    }),
    prisma.overviewFeedEvent.findMany({
      where: {
        tenantId,
        visible: true,
        kind: { in: [...FEED_NOTIFICATION_KINDS] },
        at: { gte: since },
      },
      orderBy: { at: 'desc' },
      take: 15,
    }),
  ]);

  const notifications: MerchantNotification[] = [];
  const seenIds = new Set<string>();

  const push = (n: MerchantNotification) => {
    if (seenIds.has(n.id) || state.dismissedIds.has(n.id)) return;
    const category = n.category ?? 'general';
    if (!isInAppNotificationEnabled(prefs, category)) return;
    seenIds.add(n.id);
    notifications.push({ ...n, read: state.readIds.has(n.id) });
  };

  if (pendingCount > 0 && isInAppNotificationEnabled(prefs, 'high_risk_approval')) {
    push(mapPendingApprovalsNotification(pendingCount, state.readIds.has('inbox-pending-approvals')));
  }

  if (isInAppNotificationEnabled(prefs, 'proactive_suggestion')) {
    for (const row of proactiveRows) {
      push(mapProactiveRowToNotification(row, state.readIds.has(`proactive-${row.id}`)));
      if (notifications.length >= cappedLimit) break;
    }
  }

  for (const row of feedRows) {
    if (notifications.length >= cappedLimit) break;
    const item = {
      kind: row.kind as import('./OverviewFeedService').OverviewFeedKind,
      at: row.at.toISOString(),
      id: row.itemId,
      cursor: '',
      payload: row.payload as Record<string, unknown>,
    };
    const mapped = mapOverviewFeedItemToNotification(item);
    if (mapped) push(mapped);
  }

  for (const item of feed.items) {
    if (notifications.length >= cappedLimit) break;
    const mapped = mapActivityToNotification(item);
    if (mapped) push(mapped);
  }

  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return notifications.slice(0, cappedLimit);
}

export async function buildNotificationInbox(
  tenantId: string,
  actorId: string,
  limit = 30,
  cursorRaw?: string,
  groupKey?: string,
): Promise<NotificationInboxResponse> {
  const cappedLimit = Math.min(Math.max(limit, 1), 50);
  const [state, settings] = await Promise.all([
    getNotificationStateMap(tenantId, actorId),
    getMerchantSettings(tenantId),
  ]);

  const cursor = decodeNotificationCursor(cursorRaw);

  if (groupKey && isNotificationMaterializeEnabled()) {
    const members = await listGroupedMembers(tenantId, groupKey, state.readIds, state.dismissedIds);
    const unreadCount = await countUnreadMaterialized(tenantId, state.readIds, state.dismissedIds);
    return { notifications: members, hasMore: false, unreadCount };
  }

  if (isNotificationMaterializeEnabled()) {
    const { notifications, hasMore } = await listMaterializedNotifications(tenantId, {
      limit: cappedLimit,
      cursor,
      readIds: state.readIds,
      dismissedIds: state.dismissedIds,
    });
    const unreadCount = await countUnreadMaterialized(tenantId, state.readIds, state.dismissedIds);
    const last = notifications[notifications.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeNotificationCursor({ createdAt: last.createdAt, id: last.id })
        : null;
    return { notifications, hasMore, nextCursor, unreadCount };
  }

  if (isVirtualInboxFallbackEnabled() || !isNotificationMaterializeEnabled()) {
    const notifications = await buildVirtualNotificationInbox(
      tenantId,
      state,
      settings.notificationPrefs,
      cappedLimit,
    );
    const unreadCount = notifications.filter((n) => !n.read).length;
    return { notifications, hasMore: false, unreadCount };
  }

  return { notifications: [], hasMore: false, unreadCount: 0 };
}

/** Persist virtual notifications during backfill or migration. */
export async function syncVirtualNotificationsToStore(
  tenantId: string,
  limit = 50,
): Promise<number> {
  const state = { readIds: new Set<string>(), dismissedIds: new Set<string>() };
  const settings = await getMerchantSettings(tenantId);
  const virtual = await buildVirtualNotificationInbox(
    tenantId,
    state,
    settings.notificationPrefs,
    limit,
  );
  let count = 0;
  for (const n of virtual) {
    await materializeNotification({
      tenantId,
      notification: n,
      sourceType: n.kind,
      sourceId: n.id,
      skipGrouping: true,
    });
    count += 1;
  }
  return count;
}

export { NOTIFICATION_HISTORY_DAYS, type NotificationCursor };
