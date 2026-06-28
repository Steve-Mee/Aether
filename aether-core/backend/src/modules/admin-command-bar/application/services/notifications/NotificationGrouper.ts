import { prisma } from '../../../../../shared/prisma/client';
import type { MerchantNotification, NotificationKind } from './notificationTypes';
import { APPROVAL_GROUP_WINDOW_MS, PROACTIVE_GROUP_WINDOW_MS } from './notificationConfig';

export interface GroupRollupResult {
  notification: MerchantNotification;
  hideIndividual: boolean;
}

const GROUPABLE_KINDS: NotificationKind[] = ['proactive_suggestion', 'approval_needed'];

function groupKeyFor(tenantId: string, kind: NotificationKind): string | null {
  if (kind === 'proactive_suggestion') return `proactive:${tenantId}`;
  if (kind === 'approval_needed') return `approval:${tenantId}`;
  return null;
}

function windowMsFor(kind: NotificationKind): number {
  if (kind === 'proactive_suggestion') return PROACTIVE_GROUP_WINDOW_MS;
  if (kind === 'approval_needed') return APPROVAL_GROUP_WINDOW_MS;
  return 0;
}

function rollupTitle(kind: NotificationKind, count: number): string {
  if (kind === 'proactive_suggestion') {
    return count === 1 ? 'Nieuwe proactieve suggestie' : `${count} nieuwe proactieve suggesties`;
  }
  return count === 1 ? 'Goedkeuring vereist' : `${count} goedkeuringen wachten`;
}

export async function applyNotificationGrouping(
  tenantId: string,
  notification: MerchantNotification,
  sourceType: string,
  sourceId: string,
): Promise<GroupRollupResult> {
  if (!GROUPABLE_KINDS.includes(notification.kind)) {
    return { notification, hideIndividual: false };
  }

  const groupKey = groupKeyFor(tenantId, notification.kind);
  if (!groupKey) return { notification, hideIndividual: false };

  const since = new Date(Date.now() - windowMsFor(notification.kind));
  const existing = await prisma.merchantNotification.findFirst({
    where: {
      tenantId,
      groupKey,
      visible: true,
      createdAt: { gte: since },
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!existing || existing.id === notification.id) {
    return {
      notification: { ...notification, groupKey, groupCount: 1 },
      hideIndividual: false,
    };
  }

  const nextCount = existing.groupCount + 1;
  const rollupId = existing.id;

  await prisma.merchantNotification.update({
    where: { id: rollupId },
    data: {
      groupCount: nextCount,
      title: rollupTitle(notification.kind, nextCount),
      body: notification.body,
      updatedAt: new Date(),
    },
  });

  if (notification.id !== rollupId) {
    await prisma.merchantNotification.upsert({
      where: { id: notification.id },
      update: { visible: false, groupKey },
      create: {
        id: notification.id,
        tenantId,
        kind: notification.kind,
        category: notification.category ?? 'general',
        title: notification.title,
        body: notification.body,
        severity: notification.severity,
        href: notification.href,
        actionLabel: notification.actionLabel,
        sourceType,
        sourceId,
        groupKey,
        groupCount: 1,
        visible: false,
        createdAt: new Date(notification.createdAt),
      },
    });
  }

  return {
    notification: {
      id: rollupId,
      kind: notification.kind,
      title: rollupTitle(notification.kind, nextCount),
      body: notification.body,
      severity: notification.severity,
      read: false,
      createdAt: existing.createdAt.toISOString(),
      href: notification.href ?? existing.href ?? undefined,
      actionLabel: notification.actionLabel ?? existing.actionLabel ?? undefined,
      source: 'system',
      category: notification.category,
      groupKey,
      groupCount: nextCount,
    },
    hideIndividual: true,
  };
}
