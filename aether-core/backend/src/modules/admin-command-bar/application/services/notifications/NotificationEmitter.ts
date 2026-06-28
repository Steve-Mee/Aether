import { getMerchantSettings } from '../../../../../shared/settings/TenantSettingsService';
import type { MerchantNotification } from './notificationTypes';
import { isInAppNotificationEnabled } from './notificationPrefUtils';
import { materializeNotification } from './NotificationWriter';
import { notificationDeliveryService } from '../../../../../shared/notifications/notificationDeliveryService';

export interface NotificationPushEvent {
  type: 'notification_push';
  notification: MerchantNotification;
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

type Listener = (event: NotificationPushEvent | NotificationStateChangedEvent) => void;

function isNotificationSseEnabled(): boolean {
  const v = process.env.NOTIFICATION_SSE_ENABLED;
  if (v === 'false' || v === '0') return false;
  return v === 'true' || v === '1' || process.env.NODE_ENV === 'production';
}

class NotificationEmitterImpl {
  private listeners = new Map<string, Set<Listener>>();

  subscribe(tenantId: string, listener: Listener): () => void {
    let set = this.listeners.get(tenantId);
    if (!set) {
      set = new Set();
      this.listeners.set(tenantId, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) this.listeners.delete(tenantId);
    };
  }

  private dispatch(tenantId: string, event: NotificationPushEvent | NotificationStateChangedEvent): void {
    const set = this.listeners.get(tenantId);
    if (!set) return;
    for (const listener of set) {
      try {
        listener(event);
      } catch {
        /* ignore subscriber errors */
      }
    }
  }

  async emit(
    tenantId: string,
    notification: MerchantNotification,
    opts?: { sourceType?: string; sourceId?: string; actorId?: string },
  ): Promise<void> {
    const category = notification.category ?? 'general';
    try {
      const settings = await getMerchantSettings(tenantId);
      if (!isInAppNotificationEnabled(settings.notificationPrefs, category)) return;
    } catch {
      /* best-effort prefs check */
    }

    const materialized = await materializeNotification({
      tenantId,
      notification,
      sourceType: opts?.sourceType ?? notification.kind,
      sourceId: opts?.sourceId ?? notification.id,
    });

    const payload = materialized ?? notification;

    void notificationDeliveryService.deliverPush(tenantId, opts?.actorId, payload);

    if (!isNotificationSseEnabled()) return;

    this.dispatch(tenantId, {
      type: 'notification_push',
      notification: payload,
      actorId: opts?.actorId,
      ts: Date.now(),
    });
  }

  emitStateChanged(
    tenantId: string,
    actorId: string,
    notificationId: string,
    action: 'read' | 'dismiss' | 'mark_all_read',
  ): void {
    if (!isNotificationSseEnabled()) return;
    this.dispatch(tenantId, {
      type: 'notification_state_changed',
      actorId,
      notificationId,
      action,
      ts: Date.now(),
    });
  }
}

export const notificationEmitter = new NotificationEmitterImpl();

export { isNotificationSseEnabled };
