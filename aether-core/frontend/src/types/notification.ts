/**
 * In-app notification types.
 * @see GET /api/admin/notifications
 * @see GET/PUT /api/admin/settings → notificationPrefs
 */

export type NotificationSeverity = 'info' | 'warning' | 'action';

export type NotificationSource = 'live-demo' | 'user' | 'system';

export type NotificationKind = NotificationCategory;

export type NotificationCategory =
  | 'autonomous_low_risk'
  | 'high_risk_approval'
  | 'supplier_change'
  | 'weekly_digest'
  | 'general';

/** Canonical in-app notification entity. */
export interface AppNotification {
  id: string;
  title: string;
  body: string;
  severity: NotificationSeverity;
  read: boolean;
  createdAt: string;
  href?: string;
  actionLabel?: string;
  source: NotificationSource;
  category?: NotificationCategory;
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
