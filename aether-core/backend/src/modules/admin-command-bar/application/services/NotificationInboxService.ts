import { countPendingApprovals } from '../../../../shared/approval/approvalService';
import { getMerchantSettings } from '../../../../shared/settings/TenantSettingsService';
import type { ActivityFeedService } from './ActivityFeedService';
import { resolveActivitySince } from './ActivityFeedService';
import type { NotificationReadStateService } from './NotificationReadStateService';
import type { NotificationWriterService } from './notifications/NotificationWriter';
import type { NotificationPort } from '../ports/NotificationPort';
import type { OverviewFeedPort } from '../ports/OverviewFeedPort';
import {
  mapActivityToNotification,
  mapOverviewFeedItemToNotification,
  mapPendingApprovalsNotification,
  mapProactiveRowToNotification,
  notificationRowToDto,
} from './notifications/notificationMappers';
import { isInAppNotificationEnabled } from './notifications/notificationPrefUtils';
import type { MerchantNotification } from './notifications/notificationTypes';
import {
  isNotificationMaterializeEnabled,
  isVirtualInboxFallbackEnabled,
  NOTIFICATION_HISTORY_DAYS,
} from './notifications/notificationConfig';
import {
  decodeNotificationCursor,
  encodeNotificationCursor,
  type NotificationCursor,
} from './notifications/notificationCursor';

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

export class NotificationInboxService {
  constructor(
    private notificationPort: NotificationPort,
    private overviewFeedPort: OverviewFeedPort,
    private activityFeedService: ActivityFeedService,
    private readStateService: NotificationReadStateService,
    private notificationWriter: NotificationWriterService,
  ) {}

  private async listMaterializedNotifications(
    tenantId: string,
    opts: {
      limit: number;
      cursor?: NotificationCursor | null;
      groupKey?: string;
      readIds: Set<string>;
      dismissedIds: Set<string>;
    },
  ): Promise<{ notifications: MerchantNotification[]; hasMore: boolean }> {
    const since = new Date(Date.now() - NOTIFICATION_HISTORY_DAYS * 86_400_000);
    const take = opts.limit + 1;

    const rows = await this.notificationPort.listVisibleSince(tenantId, since, {
      take,
      cursor: opts.cursor,
      groupKey: opts.groupKey,
    });

    const hasMore = rows.length > opts.limit;
    const slice = rows.slice(0, opts.limit);

    const notifications = slice
      .filter((row) => !opts.dismissedIds.has(row.id))
      .map((row) => notificationRowToDto(row, opts.readIds.has(row.id)));

    return { notifications, hasMore };
  }

  private async countUnreadMaterialized(
    tenantId: string,
    readIds: Set<string>,
    dismissedIds: Set<string>,
  ): Promise<number> {
    const since = new Date(Date.now() - NOTIFICATION_HISTORY_DAYS * 86_400_000);
    const ids = await this.notificationPort.listVisibleIdsSince(tenantId, since);
    return ids.filter((id) => !readIds.has(id) && !dismissedIds.has(id)).length;
  }

  private async listGroupedMembers(
    tenantId: string,
    groupKey: string,
    readIds: Set<string>,
    dismissedIds: Set<string>,
    limit = 20,
  ): Promise<MerchantNotification[]> {
    const rows = await this.notificationPort.listByGroupKey(tenantId, groupKey, limit);
    return rows
      .filter((row) => !dismissedIds.has(row.id))
      .map((row) => notificationRowToDto(row, readIds.has(row.id)));
  }

  private async buildVirtualNotificationInbox(
    tenantId: string,
    state: { readIds: Set<string>; dismissedIds: Set<string> },
    prefs: import('../../../../shared/settings/merchantSettingsTypes').NotificationPrefs,
    cappedLimit: number,
  ): Promise<MerchantNotification[]> {
    const since = resolveActivitySince(7);

    const [feed, pendingCount, proactiveRows, feedRows] = await Promise.all([
      this.activityFeedService.buildActivityFeed({ tenantId, since, limit: cappedLimit * 2 }),
      countPendingApprovals(tenantId),
      this.overviewFeedPort.findActiveProactiveForInbox(tenantId, 5),
      this.overviewFeedPort.findFeedEventsByKinds(
        tenantId,
        [...FEED_NOTIFICATION_KINDS],
        since,
        15,
      ),
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

  async buildNotificationInbox(
    tenantId: string,
    actorId: string,
    limit = 30,
    cursorRaw?: string,
    groupKey?: string,
  ): Promise<NotificationInboxResponse> {
    const cappedLimit = Math.min(Math.max(limit, 1), 50);
    const [state, settings] = await Promise.all([
      this.readStateService.getNotificationStateMap(tenantId, actorId),
      getMerchantSettings(tenantId),
    ]);

    const cursor = decodeNotificationCursor(cursorRaw);

    if (groupKey && isNotificationMaterializeEnabled()) {
      const members = await this.listGroupedMembers(
        tenantId,
        groupKey,
        state.readIds,
        state.dismissedIds,
      );
      const unreadCount = await this.countUnreadMaterialized(
        tenantId,
        state.readIds,
        state.dismissedIds,
      );
      return { notifications: members, hasMore: false, unreadCount };
    }

    if (isNotificationMaterializeEnabled()) {
      const { notifications, hasMore } = await this.listMaterializedNotifications(tenantId, {
        limit: cappedLimit,
        cursor,
        readIds: state.readIds,
        dismissedIds: state.dismissedIds,
      });
      const unreadCount = await this.countUnreadMaterialized(
        tenantId,
        state.readIds,
        state.dismissedIds,
      );
      const last = notifications[notifications.length - 1];
      const nextCursor =
        hasMore && last
          ? encodeNotificationCursor({ createdAt: last.createdAt, id: last.id })
          : null;
      return { notifications, hasMore, nextCursor, unreadCount };
    }

    if (isVirtualInboxFallbackEnabled() || !isNotificationMaterializeEnabled()) {
      const notifications = await this.buildVirtualNotificationInbox(
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

  async syncVirtualNotificationsToStore(tenantId: string, limit = 50): Promise<number> {
    const state = { readIds: new Set<string>(), dismissedIds: new Set<string>() };
    const settings = await getMerchantSettings(tenantId);
    const virtual = await this.buildVirtualNotificationInbox(
      tenantId,
      state,
      settings.notificationPrefs,
      limit,
    );
    let count = 0;
    for (const n of virtual) {
      await this.notificationWriter.materializeNotification({
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
}

export { NOTIFICATION_HISTORY_DAYS, type NotificationCursor };
