import { prisma } from '../../../../../shared/prisma/client';
import type { MerchantNotification } from './notificationTypes';
import { applyNotificationGrouping } from './NotificationGrouper';
import { isNotificationMaterializeEnabled } from './notificationConfig';

export interface MaterializeInput {
  tenantId: string;
  notification: MerchantNotification;
  sourceType: string;
  sourceId?: string;
  skipGrouping?: boolean;
}

function rowToDto(
  row: {
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
  },
  read: boolean,
): MerchantNotification {
  return {
    id: row.id,
    kind: row.kind as MerchantNotification['kind'],
    title: row.title,
    body: row.body,
    severity: row.severity as MerchantNotification['severity'],
    read,
    createdAt: row.createdAt.toISOString(),
    href: row.href ?? undefined,
    actionLabel: row.actionLabel ?? undefined,
    source: 'system',
    category: row.category as MerchantNotification['category'],
    groupKey: row.groupKey ?? undefined,
    groupCount: row.groupCount,
  };
}

export { rowToDto as notificationRowToDto };

export async function materializeNotification(input: MaterializeInput): Promise<MerchantNotification | null> {
  if (!isNotificationMaterializeEnabled()) return input.notification;

  const sourceId = input.sourceId ?? '';
  let notification = input.notification;

  if (!input.skipGrouping) {
    const grouped = await applyNotificationGrouping(
      input.tenantId,
      notification,
      input.sourceType,
      sourceId,
    );
    if (grouped.hideIndividual) {
      return grouped.notification;
    }
    notification = grouped.notification;
  }

  await prisma.merchantNotification.upsert({
    where: { id: notification.id },
    update: {
      title: notification.title,
      body: notification.body,
      severity: notification.severity,
      href: notification.href,
      actionLabel: notification.actionLabel,
      groupKey: notification.groupKey,
      groupCount: notification.groupCount ?? 1,
      visible: true,
      updatedAt: new Date(),
    },
    create: {
      id: notification.id,
      tenantId: input.tenantId,
      kind: notification.kind,
      category: notification.category ?? 'general',
      title: notification.title,
      body: notification.body,
      severity: notification.severity,
      href: notification.href,
      actionLabel: notification.actionLabel,
      sourceType: input.sourceType,
      sourceId,
      groupKey: notification.groupKey,
      groupCount: notification.groupCount ?? 1,
      visible: true,
      createdAt: new Date(notification.createdAt),
    },
  });

  return notification;
}

export async function materializeAndEmit(
  tenantId: string,
  notification: MerchantNotification,
  sourceType: string,
  sourceId?: string,
): Promise<MerchantNotification> {
  const result = await materializeNotification({
    tenantId,
    notification,
    sourceType,
    sourceId,
  });
  return result ?? notification;
}
