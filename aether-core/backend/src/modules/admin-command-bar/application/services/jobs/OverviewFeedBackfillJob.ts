import type { ProactiveSuggestionDto } from '../../../../../ai/intelligence/proactive/ProactiveSuggestionService';
import type { ActivityFeedPort } from '../../ports/ActivityFeedPort';
import type { HandoffOverviewPort } from '../../ports/HandoffOverviewPort';
import type { OverviewFeedPort } from '../../ports/OverviewFeedPort';
import type { TenantDirectoryPort } from '../../ports/TenantDirectoryPort';
import type { OverviewFeedWriterService } from '../OverviewFeedWriter';
import type { OverviewFeedService } from '../OverviewFeedService';
import {
  activityToItem,
  approvalToItem,
  goalToItem,
  type OverviewFeedQuery,
} from '../OverviewFeedService';
import { mapAuditRowToActivityItem, resolveActivitySince } from '../ActivityFeedService';
import { notifyOverviewHandoff } from '../OverviewFeedNotify';
import { isOverviewFeedBackfillEnabled } from '../overviewFeedConfig';
import { logger } from '../../../../../shared/logging/logger';

const DEFAULT_TENANT = process.env.AETHER_DEFAULT_TENANT ?? 'tenant_default';

export class OverviewFeedBackfillJob {
  private ran = false;

  constructor(
    private tenantDirectory: TenantDirectoryPort,
    private activityFeedPort: ActivityFeedPort,
    private overviewFeedPort: OverviewFeedPort,
    private handoffOverviewPort: HandoffOverviewPort,
    private overviewFeedWriter: OverviewFeedWriterService,
    private overviewFeedService: OverviewFeedService,
  ) {}

  async backfillOverviewFeedForTenant(
    tenantId: string,
    days = 30,
    proactiveDtos: ProactiveSuggestionDto[] = [],
  ): Promise<number> {
    const since = resolveActivitySince(days);
    let count = 0;

    const audits = await this.activityFeedPort.findAuditLogs({
      tenantId,
      since,
      take: 500,
    });
    for (const row of audits) {
      const item = activityToItem(mapAuditRowToActivityItem(row));
      await this.overviewFeedWriter.upsertFeedEvent(tenantId, 'created', item);
      count += 1;
    }

    const commands = await this.activityFeedPort.findCommands(tenantId, since, 200);
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
      await this.overviewFeedWriter.upsertFeedEvent(tenantId, 'created', item);
      count += 1;
    }

    const approvals = await this.overviewFeedPort.findApprovalsSince(tenantId, since, 200);
    for (const row of approvals) {
      const item = approvalToItem(row);
      await this.overviewFeedWriter.upsertFeedEvent(
        tenantId,
        row.status === 'pending' ? 'created' : 'updated',
        item,
      );
      count += 1;
    }

    const goals = await this.overviewFeedPort.findActiveGoalsUpdatedSince(tenantId, since, 50);
    for (const row of goals) {
      await this.overviewFeedWriter.upsertFeedEvent(tenantId, 'created', goalToItem(row));
      count += 1;
    }

    const handoffs = await this.handoffOverviewPort.findReflectionHandoffs(tenantId, since, 200);
    for (const row of handoffs) {
      notifyOverviewHandoff(tenantId, {
        id: row.id,
        at: row.createdAt.toISOString(),
        fromAgentKey: row.fromAgentKey,
        toAgentKey: row.toAgentKey,
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

  async runOnce(proactiveDtosByTenant?: Map<string, ProactiveSuggestionDto[]>): Promise<void> {
    if (this.ran || !isOverviewFeedBackfillEnabled()) return;
    this.ran = true;

    const tenantIds = await this.tenantDirectory.listTenantIds();
    const ids = tenantIds.length > 0 ? tenantIds : [DEFAULT_TENANT];

    for (const tenantId of ids) {
      try {
        const n = await this.backfillOverviewFeedForTenant(
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

  async smokeOverviewFeedQuery(query: OverviewFeedQuery): Promise<boolean> {
    const feed = await this.overviewFeedService.buildOverviewFeed(query, []);
    return Array.isArray(feed.items);
  }
}
