export interface NotificationCursor {
  createdAt: string;
  id: string;
}

export interface NotificationRecord {
  id: string;
  kind: string;
  category: string;
  title: string;
  body: string;
  severity: string;
  href: string | null;
  actionLabel: string | null;
  groupKey: string | null;
  groupCount: number;
  createdAt: Date;
  updatedAt?: Date;
  visible?: boolean;
}

export interface UpsertNotificationInput {
  id: string;
  tenantId: string;
  kind: string;
  category: string;
  title: string;
  body: string;
  severity: string;
  href?: string;
  actionLabel?: string;
  sourceType: string;
  sourceId: string;
  groupKey?: string;
  groupCount: number;
  visible: boolean;
  createdAt: Date;
}

export interface InboxStateRecord {
  notificationId: string;
  readAt: Date | null;
  dismissedAt: Date | null;
}

export interface NotificationDigestStateRecord {
  lastSentAt: Date | null;
  lastWindowStart: Date | null;
}

export interface NotificationPort {
  listVisibleSince(
    tenantId: string,
    since: Date,
    opts: { take: number; cursor?: NotificationCursor | null; groupKey?: string },
  ): Promise<NotificationRecord[]>;

  listVisibleIdsSince(tenantId: string, since: Date): Promise<string[]>;

  listByGroupKey(tenantId: string, groupKey: string, limit: number): Promise<NotificationRecord[]>;

  findRecentVisibleGroupMember(
    tenantId: string,
    groupKey: string,
    since: Date,
  ): Promise<NotificationRecord | null>;

  updateNotification(
    id: string,
    data: {
      groupCount?: number;
      title?: string;
      body?: string;
      updatedAt?: Date;
      visible?: boolean;
      groupKey?: string;
    },
  ): Promise<void>;

  upsertNotification(input: UpsertNotificationInput, updateVisible?: boolean): Promise<void>;

  listInboxStates(tenantId: string, actorId: string): Promise<InboxStateRecord[]>;

  upsertInboxRead(
    tenantId: string,
    actorId: string,
    notificationId: string,
    readAt: Date,
    dismissedAt?: Date | null,
  ): Promise<void>;

  upsertManyInboxRead(
    tenantId: string,
    actorId: string,
    notificationIds: string[],
    readAt: Date,
  ): Promise<void>;

  upsertDigestState(tenantId: string): Promise<NotificationDigestStateRecord>;

  updateDigestState(
    tenantId: string,
    data: { lastSentAt: Date; lastWindowStart: Date; updatedAt: Date },
  ): Promise<void>;
}
