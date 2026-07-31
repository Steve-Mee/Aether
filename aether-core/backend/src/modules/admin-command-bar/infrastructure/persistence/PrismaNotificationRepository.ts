import { prisma } from '../../../../shared/prisma/client';
import type {
  NotificationCursor,
  NotificationPort,
  NotificationRecord,
  UpsertNotificationInput,
} from '../../application/ports/NotificationPort';

function mapRow(row: {
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
}): NotificationRecord {
  return {
    id: row.id,
    kind: row.kind,
    category: row.category,
    title: row.title,
    body: row.body,
    severity: row.severity,
    href: row.href,
    actionLabel: row.actionLabel,
    groupKey: row.groupKey,
    groupCount: row.groupCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    visible: row.visible,
  };
}

export class PrismaNotificationRepository implements NotificationPort {
  async listVisibleSince(
    tenantId: string,
    since: Date,
    opts: { take: number; cursor?: NotificationCursor | null; groupKey?: string },
  ): Promise<NotificationRecord[]> {
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
      take: opts.take,
    });

    return rows.map(mapRow);
  }

  async listVisibleIdsSince(tenantId: string, since: Date): Promise<string[]> {
    const rows = await prisma.merchantNotification.findMany({
      where: { tenantId, visible: true, createdAt: { gte: since } },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  async listByGroupKey(
    tenantId: string,
    groupKey: string,
    limit: number,
  ): Promise<NotificationRecord[]> {
    const rows = await prisma.merchantNotification.findMany({
      where: { tenantId, groupKey },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(mapRow);
  }

  async findRecentVisibleGroupMember(
    tenantId: string,
    groupKey: string,
    since: Date,
  ): Promise<NotificationRecord | null> {
    const row = await prisma.merchantNotification.findFirst({
      where: {
        tenantId,
        groupKey,
        visible: true,
        createdAt: { gte: since },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return row ? mapRow(row) : null;
  }

  async updateNotification(
    id: string,
    data: {
      groupCount?: number;
      title?: string;
      body?: string;
      updatedAt?: Date;
      visible?: boolean;
      groupKey?: string;
    },
  ): Promise<void> {
    await prisma.merchantNotification.update({ where: { id }, data });
  }

  async upsertNotification(input: UpsertNotificationInput, updateVisible = true): Promise<void> {
    await prisma.merchantNotification.upsert({
      where: { id: input.id },
      update: {
        title: input.title,
        body: input.body,
        severity: input.severity,
        href: input.href,
        actionLabel: input.actionLabel,
        groupKey: input.groupKey,
        groupCount: input.groupCount,
        visible: updateVisible ? input.visible : undefined,
        updatedAt: new Date(),
      },
      create: {
        id: input.id,
        tenantId: input.tenantId,
        kind: input.kind,
        category: input.category,
        title: input.title,
        body: input.body,
        severity: input.severity,
        href: input.href,
        actionLabel: input.actionLabel,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        groupKey: input.groupKey,
        groupCount: input.groupCount,
        visible: input.visible,
        createdAt: input.createdAt,
      },
    });
  }

  async listInboxStates(tenantId: string, actorId: string) {
    return prisma.notificationInboxState.findMany({
      where: { tenantId, actorId },
      select: { notificationId: true, readAt: true, dismissedAt: true },
    });
  }

  async upsertInboxRead(
    tenantId: string,
    actorId: string,
    notificationId: string,
    readAt: Date,
    dismissedAt?: Date | null,
  ): Promise<void> {
    await prisma.notificationInboxState.upsert({
      where: {
        tenantId_actorId_notificationId: { tenantId, actorId, notificationId },
      },
      update: {
        readAt,
        dismissedAt: dismissedAt === undefined ? null : dismissedAt,
      },
      create: {
        tenantId,
        actorId,
        notificationId,
        readAt,
        ...(dismissedAt !== undefined ? { dismissedAt } : {}),
      },
    });
  }

  async upsertManyInboxRead(
    tenantId: string,
    actorId: string,
    notificationIds: string[],
    readAt: Date,
  ): Promise<void> {
    await prisma.$transaction(
      notificationIds.map((notificationId) =>
        prisma.notificationInboxState.upsert({
          where: {
            tenantId_actorId_notificationId: { tenantId, actorId, notificationId },
          },
          update: { readAt, dismissedAt: null },
          create: {
            tenantId,
            actorId,
            notificationId,
            readAt,
          },
        }),
      ),
    );
  }

  async upsertDigestState(tenantId: string) {
    return prisma.notificationDigestState.upsert({
      where: { tenantId },
      update: {},
      create: { tenantId, updatedAt: new Date() },
    });
  }

  async updateDigestState(
    tenantId: string,
    data: { lastSentAt: Date; lastWindowStart: Date; updatedAt: Date },
  ): Promise<void> {
    await prisma.notificationDigestState.update({
      where: { tenantId },
      data,
    });
  }
}
