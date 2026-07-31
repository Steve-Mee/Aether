import { countPendingApprovals } from '../../../../../shared/approval/approvalService';
import type { ProactiveSuggestionDto } from '../../../../../ai/intelligence/proactive/ProactiveSuggestionService';
import type { ActivityFeedService } from '../ActivityFeedService';
import { resolveActivitySince } from '../ActivityFeedService';
import type { OverviewFeedPort } from '../../ports/OverviewFeedPort';
import {
  SOURCE_BATCH,
  compareItems,
  decodeOverviewCursor,
  encodeOverviewCursor,
  isBeforeCursor,
} from './overviewFeedCursor';
import {
  activityToItem,
  applyActivityFilters,
  applyProactiveFilters,
  approvalToItem,
  goalToItem,
  matchesSearch,
  proactiveToItem,
} from './overviewFeedMappers';
import type { OverviewFeedItem, OverviewFeedQuery, OverviewFeedResponse } from './overviewFeedTypes';

export async function buildOverviewFeedLegacy(
  overviewFeedPort: OverviewFeedPort,
  activityFeedService: ActivityFeedService,
  query: OverviewFeedQuery,
  proactiveDtos: ProactiveSuggestionDto[],
): Promise<OverviewFeedResponse> {
  const limit = Math.min(Math.max(query.limit ?? 25, 1), 50);
  const days = query.days ?? 7;
  const since = resolveActivitySince(days);
  const cursor = decodeOverviewCursor(query.cursor);

  const [activityFeed, pendingApprovals, approvalRows, goalRows, proactiveRows] =
    await Promise.all([
      activityFeedService.buildActivityFeed({
        tenantId: query.tenantId,
        since,
        limit: SOURCE_BATCH,
        module: query.module,
        agentKey: query.agentKey,
      }),
      countPendingApprovals(query.tenantId),
      overviewFeedPort.findPendingApprovals(query.tenantId, 20),
      overviewFeedPort.findActiveGoals(query.tenantId, 10),
      overviewFeedPort.findActiveProactiveSuggestions(query.tenantId, 20),
    ]);

  const proactiveById = new Map(proactiveDtos.map((d) => [d.id, d]));

  let items: OverviewFeedItem[] = [];

  if (!query.actionType || query.actionType === 'proactive') {
    for (const row of proactiveRows) {
      const dto = proactiveById.get(row.id);
      if (!dto) continue;
      if (!applyProactiveFilters(dto, query)) continue;
      items.push(proactiveToItem(dto, row.createdAt.toISOString()));
    }
  }

  if (!query.actionType || query.actionType === 'approval') {
    for (const row of approvalRows) {
      const item = approvalToItem(row);
      if (!matchesSearch(`${row.module} ${row.actionType}`, query.search)) continue;
      items.push(item);
    }
  }

  if (!query.actionType || query.actionType === 'goal') {
    for (const row of goalRows) {
      items.push(goalToItem(row));
    }
  }

  if (
    !query.actionType ||
    query.actionType === 'autonomous' ||
    query.actionType === 'approval' ||
    query.actionType === 'goal'
  ) {
    for (const act of activityFeed.items) {
      if (!applyActivityFilters(act, query)) continue;
      items.push(activityToItem(act));
    }
  }

  items.sort(compareItems);

  if (cursor) {
    items = items.filter((item) => isBeforeCursor(item, cursor));
  }

  const page = items.slice(0, limit + 1);
  const hasMore = page.length > limit;
  const result = hasMore ? page.slice(0, limit) : page;

  for (const item of result) {
    item.cursor = encodeOverviewCursor({ at: item.at, id: item.id, kind: item.kind });
  }

  const last = result[result.length - 1];

  return {
    items: result,
    nextCursor: hasMore && last ? last.cursor : null,
    hasMore,
    meta: {
      pendingApprovals,
      proactiveCount: proactiveRows.length,
      activeGoals: goalRows.length,
    },
  };
}
