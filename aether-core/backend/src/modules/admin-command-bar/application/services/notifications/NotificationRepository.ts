import { prisma } from '../../../../../shared/prisma/client';
import type { MerchantNotification } from './notificationTypes';
import { notificationRowToDto } from './NotificationWriter';
import { NOTIFICATION_HISTORY_DAYS } from './notificationConfig';

export interface NotificationCursor {
  createdAt: string;
  id: string;
}

export function encodeNotificationCursor(cursor: NotificationCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export function decodeNotificationCursor(raw: string | undefined): NotificationCursor | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as NotificationCursor;
    if (parsed.createdAt && parsed.id) return parsed;
  } catch {
    return null;
  }
  return null;
}

export async function listMaterializedNotifications(
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

  const cursorFilter = opts.cursor
    ? {
        OR: [
          { createdAt: { lt: new Date(opts.cursor.createdAt) } },
          { createdAt: new Date(opts.cursor.createdAt), id: { lt: opts.cursor.id } },
        ],
      }
    : {};

  const rows = await prisma.merchantNotification.findMany({
    where: {
      tenantId,
      visible: true,
      createdAt: { gte: since },
      ...(opts.groupKey ? { groupKey: opts.groupKey } : {}),
      ...cursorFilter,
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
  });

  const hasMore = rows.length > opts.limit;
  const slice = rows.slice(0, opts.limit);

  const notifications = slice
    .filter((row) => !opts.dismissedIds.has(row.id))
    .map((row) => notificationRowToDto(row, opts.readIds.has(row.id)));

  return { notifications, hasMore };
}

export async function countUnreadMaterialized(
  tenantId: string,
  readIds: Set<string>,
  dismissedIds: Set<string>,
): Promise<number> {
  const since = new Date(Date.now() - NOTIFICATION_HISTORY_DAYS * 86_400_000);
  const rows = await prisma.merchantNotification.findMany({
    where: { tenantId, visible: true, createdAt: { gte: since } },
    select: { id: true },
  });
  return rows.filter((r) => !readIds.has(r.id) && !dismissedIds.has(r.id)).length;
}

export async function listGroupedMembers(
  tenantId: string,
  groupKey: string,
  readIds: Set<string>,
  dismissedIds: Set<string>,
  limit = 20,
): Promise<MerchantNotification[]> {
  const rows = await prisma.merchantNotification.findMany({
    where: { tenantId, groupKey },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return rows
    .filter((row) => !dismissedIds.has(row.id))
    .map((row) => notificationRowToDto(row, readIds.has(row.id)));
}
