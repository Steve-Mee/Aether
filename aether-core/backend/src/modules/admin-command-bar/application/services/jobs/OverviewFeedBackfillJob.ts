import { prisma } from '../../../../shared/prisma/client';
import type { ProactiveSuggestionDto } from '../../../../ai/intelligence/proactive/ProactiveSuggestionService';
import {
  activityToItem,
  approvalToItem,
  buildOverviewFeed,
  goalToItem,
  type OverviewFeedQuery,
} from './OverviewFeedService';
import { buildActivityFeed, mapAuditRowToActivityItem, resolveActivitySince } from './ActivityFeedService';
import { upsertFeedEvent } from './OverviewFeedWriter';
import { notifyOverviewHandoff } from '../OverviewFeedNotify';
import { isOverviewFeedBackfillEnabled } from './overviewFeedConfig';
import { logger } from '../../../../shared/logging/logger';

const DEFAULT_TENANT = process.env.AETHER_DEFAULT_TENANT ?? 'tenant_default';

export async function backfillOverviewFeedForTenant(
  tenantId: string,
  days = 30,
  proactiveDtos: ProactiveSuggestionDto[] = [],
): Promise<number> {
  const since = resolveActivitySince(days);
  let count = 0;

  const audits = await prisma.auditLog.findMany({
    where: { tenantId, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  for (const row of audits) {
    const item = activityToItem(mapAuditRowToActivityItem(row));
    await upsertFeedEvent(tenantId, 'created', item);
    count += 1;
  }

  const commands = await prisma.command.findMany({
    where: { tenantId, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  for (const row of commands) {
    const item = activityToItem({
      id: `command-${row.id}`,
      source: 'command',
      at: row.createdAt.toISOString(),
      actionType: 'command_executed',
      actionLabel: 'Commando',
      description: row.command,
      module: 'admin-command-bar',
      risk: 'low',
      status: row.result ? 'autonomous' : 'info',
      executor: 'merchant',
    });
    await upsertFeedEvent(tenantId, 'created', item);
    count += 1;
  }

  const approvals = await prisma.approval.findMany({
    where: { tenantId, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  for (const row of approvals) {
    const item = approvalToItem(row);
    await upsertFeedEvent(tenantId, row.status === 'pending' ? 'created' : 'updated', item);
    count += 1;
  }

  const goals = await prisma.merchantGoal.findMany({
    where: { tenantId, status: 'active', updatedAt: { gte: since } },
    take: 50,
    select: {
      id: true,
      title: true,
      targetValue: true,
      currentValue: true,
      deadline: true,
      updatedAt: true,
    },
  });
  for (const row of goals) {
    await upsertFeedEvent(tenantId, 'created', goalToItem(row));
    count += 1;
  }

  const handoffs = await prisma.reflectionHandoffLog.findMany({
    where: { tenantId, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  for (const row of handoffs) {
    notifyOverviewHandoff(tenantId, {
      id: row.id,
      at: row.createdAt.toISOString(),
      fromAgentKey: row.sourceAgentKey,
      toAgentKey: row.targetAgentKey,
      mode: 'sync',
      status: 'completed',
      summary: row.summary,
      parentRunId: row.parentRunId,
    });
    count += 1;
  }

  void proactiveDtos;
  return count;
}

export class OverviewFeedBackfillJob {
  private ran = false;

  async runOnce(proactiveDtosByTenant?: Map<string, ProactiveSuggestionDto[]>): Promise<void> {
    if (this.ran || !isOverviewFeedBackfillEnabled()) return;
    this.ran = true;

    const tenants = await prisma.tenantSettings.findMany({ select: { tenantId: true } });
    const ids =
      tenants.length > 0 ? tenants.map((t) => t.tenantId) : [DEFAULT_TENANT];

    for (const tenantId of ids) {
      try {
        const n = await backfillOverviewFeedForTenant(
          tenantId,
          30,
          proactiveDtosByTenant?.get(tenantId) ?? [],
        );
        logger.info('overview_feed_backfill_done', { tenantId, count: n });
      } catch (err) {
        logger.warn('overview_feed_backfill_failed', {
          tenantId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}

export const overviewFeedBackfillJob = new OverviewFeedBackfillJob();

/** Smoke: ensure legacy query still works after backfill. */
export async function smokeOverviewFeedQuery(query: OverviewFeedQuery): Promise<boolean> {
  const feed = await buildOverviewFeed(query, []);
  return Array.isArray(feed.items);
}
