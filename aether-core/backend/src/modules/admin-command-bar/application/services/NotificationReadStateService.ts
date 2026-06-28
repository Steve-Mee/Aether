import { prisma } from '../../../../shared/prisma/client';
import { notificationEmitter } from './notifications/NotificationEmitter';

export interface NotificationStateMap {
  readIds: Set<string>;
  dismissedIds: Set<string>;
}

export async function getNotificationStateMap(
  tenantId: string,
  actorId: string
): Promise<NotificationStateMap> {
  const rows = await prisma.notificationInboxState.findMany({
    where: { tenantId, actorId },
    select: { notificationId: true, readAt: true, dismissedAt: true },
  });

  const readIds = new Set<string>();
  const dismissedIds = new Set<string>();
  for (const row of rows) {
    if (row.dismissedAt) dismissedIds.add(row.notificationId);
    if (row.readAt) readIds.add(row.notificationId);
  }
  return { readIds, dismissedIds };
}

export async function markNotificationRead(
  tenantId: string,
  actorId: string,
  notificationId: string
): Promise<void> {
  await prisma.notificationInboxState.upsert({
    where: {
      tenantId_actorId_notificationId: { tenantId, actorId, notificationId },
    },
    update: { readAt: new Date(), dismissedAt: null },
    create: {
      tenantId,
      actorId,
      notificationId,
      readAt: new Date(),
    },
  });
  notificationEmitter.emitStateChanged(tenantId, actorId, notificationId, 'read');
}

export async function markAllNotificationsRead(
  tenantId: string,
  actorId: string,
  notificationIds: string[]
): Promise<void> {
  const now = new Date();
  await prisma.$transaction(
    notificationIds.map((notificationId) =>
      prisma.notificationInboxState.upsert({
        where: {
          tenantId_actorId_notificationId: { tenantId, actorId, notificationId },
        },
        update: { readAt: now, dismissedAt: null },
        create: {
          tenantId,
          actorId,
          notificationId,
          readAt: now,
        },
      })
    )
  );
  notificationEmitter.emitStateChanged(tenantId, actorId, '*', 'mark_all_read');
}

export async function dismissNotification(
  tenantId: string,
  actorId: string,
  notificationId: string
): Promise<void> {
  await prisma.notificationInboxState.upsert({
    where: {
      tenantId_actorId_notificationId: { tenantId, actorId, notificationId },
    },
    update: { dismissedAt: new Date(), readAt: new Date() },
    create: {
      tenantId,
      actorId,
      notificationId,
      readAt: new Date(),
      dismissedAt: new Date(),
    },
  });
  notificationEmitter.emitStateChanged(tenantId, actorId, notificationId, 'dismiss');
}
