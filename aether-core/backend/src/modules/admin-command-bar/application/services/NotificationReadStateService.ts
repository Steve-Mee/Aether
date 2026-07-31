import type { NotificationPort } from '../ports/NotificationPort';
import { notificationEmitter } from './notifications/NotificationEmitter';

export interface NotificationStateMap {
  readIds: Set<string>;
  dismissedIds: Set<string>;
}

export class NotificationReadStateService {
  constructor(private notificationPort: NotificationPort) {}

  async getNotificationStateMap(
    tenantId: string,
    actorId: string,
  ): Promise<NotificationStateMap> {
    const rows = await this.notificationPort.listInboxStates(tenantId, actorId);

    const readIds = new Set<string>();
    const dismissedIds = new Set<string>();
    for (const row of rows) {
      if (row.dismissedAt) dismissedIds.add(row.notificationId);
      if (row.readAt) readIds.add(row.notificationId);
    }
    return { readIds, dismissedIds };
  }

  async markNotificationRead(
    tenantId: string,
    actorId: string,
    notificationId: string,
  ): Promise<void> {
    await this.notificationPort.upsertInboxRead(
      tenantId,
      actorId,
      notificationId,
      new Date(),
      null,
    );
    notificationEmitter.emitStateChanged(tenantId, actorId, notificationId, 'read');
  }

  async markAllNotificationsRead(
    tenantId: string,
    actorId: string,
    notificationIds: string[],
  ): Promise<void> {
    const now = new Date();
    await this.notificationPort.upsertManyInboxRead(
      tenantId,
      actorId,
      notificationIds,
      now,
    );
    notificationEmitter.emitStateChanged(tenantId, actorId, '*', 'mark_all_read');
  }

  async dismissNotification(
    tenantId: string,
    actorId: string,
    notificationId: string,
  ): Promise<void> {
    const now = new Date();
    await this.notificationPort.upsertInboxRead(
      tenantId,
      actorId,
      notificationId,
      now,
      now,
    );
    notificationEmitter.emitStateChanged(tenantId, actorId, notificationId, 'dismiss');
  }
}
