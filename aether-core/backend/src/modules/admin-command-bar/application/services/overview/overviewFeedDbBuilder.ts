import { countPendingApprovals } from '../../../../../shared/approval/approvalService';
import { resolveActivitySince } from '../ActivityFeedService';
import type { OverviewFeedPort } from '../../ports/OverviewFeedPort';
import { decodeOverviewCursor, encodeOverviewCursor } from './overviewFeedCursor';
import { rowToFeedItem } from './overviewFeedMappers';
import type {
  OverviewCursor,
  OverviewFeedItem,
  OverviewFeedMeta,
  OverviewFeedQuery,
  OverviewFeedResponse,
} from './overviewFeedTypes';

export async function fetchFeedMeta(
  overviewFeedPort: OverviewFeedPort,
  tenantId: string,
): Promise<OverviewFeedMeta> {
  const [pendingApprovals, proactiveCount, activeGoals] = await Promise.all([
    countPendingApprovals(tenantId),
    overviewFeedPort.countActiveProactiveSuggestions(tenantId),
    overviewFeedPort.countActiveGoals(tenantId),
  ]);
  return { pendingApprovals, proactiveCount, activeGoals };
}

export async function buildOverviewFeedFromDb(
  overviewFeedPort: OverviewFeedPort,
  query: OverviewFeedQuery,
): Promise<OverviewFeedResponse> {
  const limit = Math.min(Math.max(query.limit ?? 25, 1), 50);
  const days = query.days ?? 7;
  const since = resolveActivitySince(days);
  const cursor = decodeOverviewCursor(query.cursor);

  const rows = await overviewFeedPort.findFeedEvents(
    {
      tenantId: query.tenantId,
      since,
      cursor,
      riskLevel: query.risk,
      module: query.module,
      executionMode: query.executionMode,
      agentKey: query.agentKey,
      search: query.search,
      actionType: query.actionType,
    },
    limit + 1,
  );

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const items = page.map(rowToFeedItem);

  for (const item of items) {
    item.cursor = encodeOverviewCursor({ at: item.at, id: item.id, kind: item.kind });
  }

  const last = items[items.length - 1];
  const meta = await fetchFeedMeta(overviewFeedPort, query.tenantId);

  return {
    items,
    nextCursor: hasMore && last ? last.cursor : null,
    hasMore,
    meta,
  };
}

export async function listOverviewFeedEventsSince(
  overviewFeedPort: OverviewFeedPort,
  tenantId: string,
  sinceCursor: OverviewCursor | null,
  limit = 50,
): Promise<OverviewFeedItem[]> {
  const since = sinceCursor ? new Date(sinceCursor.at) : new Date(Date.now() - 60_000);
  const rows = await overviewFeedPort.findFeedEventsSince(tenantId, since, limit);
  return rows.map(rowToFeedItem).map((item) => ({
    ...item,
    cursor: encodeOverviewCursor({ at: item.at, id: item.id, kind: item.kind }),
  }));
}
