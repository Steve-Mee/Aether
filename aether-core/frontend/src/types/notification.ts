/**
 * In-app notification types.
 * @see GET /api/admin/notifications
 * @see GET/PUT /api/admin/settings → notificationPrefs
 */

export type NotificationSeverity = 'info' | 'warning' | 'action';

export type NotificationSource = 'live-demo' | 'user' | 'system';

export type NotificationKind =
  | 'proactive_suggestion'
  | 'approval_needed'
  | 'agent_action'
  | 'goal_progress'
  | 'goal_completed'
  | 'agent_handoff'
  | 'supplier_change'
  | 'system';

export type NotificationCategory =
  | 'autonomous_low_risk'
  | 'high_risk_approval'
  | 'supplier_change'
  | 'weekly_digest'
  | 'proactive_suggestion'
  | 'goal_progress'
  | 'general';

/** Canonical in-app notification entity. */
export interface AppNotification {
  id: string;
  kind?: NotificationKind;
  title: string;
  body: string;
  severity: NotificationSeverity;
  read: boolean;
  createdAt: string;
  href?: string;
  actionLabel?: string;
  source: NotificationSource;
  category?: NotificationCategory;
  groupKey?: string;
  groupCount?: number;
}

/** Input for pushing a new notification (id/read/createdAt optional). */
export type PushNotificationInput = Omit<AppNotification, 'id' | 'read' | 'createdAt'> & {
  id?: string;
  createdAt?: string;
  /** When true, inbox updates but screen readers are not announced (caller owns SR feedback). */
  skipAnnounce?: boolean;
};

/** @deprecated Use AppNotification */
export type AetherNotification = AppNotification;

export interface NotificationInboxResponse {
  notifications: AppNotification[];
  nextCursor?: string | null;
  hasMore?: boolean;
  unreadCount?: number;
}

export interface NotificationPushEvent {
  type: 'notification_push';
  notification: AppNotification;
  actorId?: string;
  ts: number;
}

export interface NotificationStateChangedEvent {
  type: 'notification_state_changed';
  actorId: string;
  notificationId: string;
  action: 'read' | 'dismiss' | 'mark_all_read';
  ts: number;
}
