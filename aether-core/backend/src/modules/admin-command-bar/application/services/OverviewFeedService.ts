import { prisma } from '../../../../shared/prisma/client';
import { countPendingApprovals } from '../../../../shared/approval/approvalService';
import type { ProactiveSuggestionDto } from '../../../../ai/intelligence/proactive/ProactiveSuggestionService';
import {
  buildActivityFeed,
  resolveActivitySince,
  type ActivityFeedItem,
  itemMatchesAgentKey,
} from './ActivityFeedService';
import { isOverviewFeedReadLegacy } from './overviewFeedConfig';

export type OverviewFeedKind =
  | 'activity'
  | 'proactive'
  | 'approval'
  | 'goal_snapshot'
  | 'goal_completed'
  | 'agent_handoff';

export interface OverviewCursor {
  at: string;
  id: string;
  kind: OverviewFeedKind;
}

export interface OverviewFeedItem {
  kind: OverviewFeedKind;
  at: string;
  id: string;
  cursor: string;
  payload: Record<string, unknown>;
}

export interface OverviewFeedQuery {
  tenantId: string;
  days?: number;
  limit?: number;
  cursor?: string;
  agentKey?: string;
  risk?: 'low' | 'high';
  module?: string;
  executionMode?: 'autonomous' | 'approval_required' | 'inform_only';
  actionType?: 'proactive' | 'autonomous' | 'goal' | 'approval';
  search?: string;
}

export interface OverviewFeedMeta {
  pendingApprovals: number;
  proactiveCount: number;
  activeGoals: number;
}

export interface OverviewFeedResponse {
  items: OverviewFeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
  meta: OverviewFeedMeta;
}

const SOURCE_BATCH = 80;

export function encodeOverviewCursor(c: OverviewCursor): string {
  return Buffer.from(JSON.stringify(c)).toString('base64url');
}

export function decodeOverviewCursor(raw: string | undefined): OverviewCursor | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as OverviewCursor;
    if (parsed.at && parsed.id && parsed.kind) return parsed;
  } catch {
    return null;
  }
  return null;
}

export function compareItems(a: OverviewFeedItem, b: OverviewFeedItem): number {
  const atDiff = new Date(b.at).getTime() - new Date(a.at).getTime();
  if (atDiff !== 0) return atDiff;
  const kindDiff = b.kind.localeCompare(a.kind);
  if (kindDiff !== 0) return kindDiff;
  return b.id.localeCompare(a.id);
}

function isBeforeCursor(item: OverviewFeedItem, cursor: OverviewCursor): boolean {
  const itemTime = new Date(item.at).getTime();
  const cursorTime = new Date(cursor.at).getTime();
  if (itemTime < cursorTime) return true;
  if (itemTime > cursorTime) return false;
  if (item.kind < cursor.kind) return true;
  if (item.kind > cursor.kind) return false;
  return item.id < cursor.id;
}

function matchesSearch(text: string, search?: string): boolean {
  if (!search?.trim()) return true;
  return text.toLowerCase().includes(search.trim().toLowerCase());
}

export function activityToItem(item: ActivityFeedItem): OverviewFeedItem {
  return {
    kind: 'activity',
    at: item.at,
    id: item.id,
    cursor: '',
    payload: item as unknown as Record<string, unknown>,
  };
}

function proactiveToItem(dto: ProactiveSuggestionDto, createdAt: string): OverviewFeedItem {
  return {
    kind: 'proactive',
    at: createdAt,
    id: dto.id,
    cursor: '',
    payload: dto as unknown as Record<string, unknown>,
  };
}

export function approvalToItem(row: {
  id: string;
  module: string;
  actionType: string;
  status: string;
  createdAt: Date;
  payload: string | null;
}): OverviewFeedItem {
  let payload: Record<string, unknown> = {};
  if (row.payload) {
    try {
      payload = JSON.parse(row.payload) as Record<string, unknown>;
    } catch {
      payload = {};
    }
  }
  return {
    kind: 'approval',
    at: row.createdAt.toISOString(),
    id: row.id,
    cursor: '',
    payload: {
      id: row.id,
      module: row.module,
      actionType: row.actionType,
      status: row.status,
      ...payload,
    },
  };
}

export function goalToItem(row: {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number | null;
  deadline: Date;
  updatedAt: Date;
}): OverviewFeedItem {
  const progressPct =
    row.currentValue != null && row.targetValue > 0
      ? Math.round((row.currentValue / row.targetValue) * 100)
      : null;
  return {
    kind: 'goal_snapshot',
    at: row.updatedAt.toISOString(),
    id: row.id,
    cursor: '',
    payload: {
      id: row.id,
      title: row.title,
      progressPct,
      deadline: row.deadline.toISOString(),
    },
  };
}

function applyActivityFilters(item: ActivityFeedItem, query: OverviewFeedQuery): boolean {
  if (query.agentKey && !itemMatchesAgentKey(item, query.agentKey)) return false;
  if (query.risk === 'high' && item.risk !== 'high') return false;
  if (query.risk === 'low' && item.risk !== 'low') return false;
  if (query.module && item.module !== query.module) return false;
  if (query.actionType === 'autonomous' && item.status !== 'autonomous') return false;
  if (query.actionType === 'goal') {
    const details = item.details ?? {};
    if (!details.goalId && !/goal/i.test(item.actionType)) return false;
  }
  if (query.actionType === 'approval' && item.status !== 'pending') return false;
  if (query.actionType === 'proactive') return false;
  const text = `${item.actionLabel} ${item.description} ${item.module}`;
  return matchesSearch(text, query.search);
}

function applyProactiveFilters(dto: ProactiveSuggestionDto, query: OverviewFeedQuery): boolean {
  if (query.actionType === 'autonomous' || query.actionType === 'approval' || query.actionType === 'goal') {
    return false;
  }
  if (query.agentKey && dto.agentKey && dto.agentKey !== query.agentKey) return false;
  if (query.risk === 'high' && dto.riskLevel !== 'high') return false;
  if (query.risk === 'low' && dto.riskLevel === 'high') return false;
  if (query.executionMode && dto.executionMode !== query.executionMode) return false;
  return matchesSearch(`${dto.label} ${dto.command} ${dto.hint ?? ''}`, query.search);
}

function rowToFeedItem(row: {
  kind: string;
  itemId: string;
  at: Date;
  payload: unknown;
}): OverviewFeedItem {
  return {
    kind: row.kind as OverviewFeedKind,
    at: row.at.toISOString(),
    id: row.itemId,
    cursor: '',
    payload: (row.payload ?? {}) as Record<string, unknown>,
  };
}

function buildDbWhere(query: OverviewFeedQuery, since: Date, cursor: OverviewCursor | null) {
  const where: Record<string, unknown> = {
    tenantId: query.tenantId,
    visible: true,
    at: { gte: since },
  };

  if (query.actionType === 'proactive') where.kind = 'proactive';
  else if (query.actionType === 'approval') where.kind = 'approval';
  else if (query.actionType === 'goal') where.kind = 'goal_snapshot';
  else if (query.actionType === 'autonomous') {
    where.kind = 'activity';
    where.executionMode = 'autonomous';
  }

  if (query.risk) where.riskLevel = query.risk;
  if (query.module) where.module = query.module;
  if (query.executionMode) where.executionMode = query.executionMode;
  if (query.agentKey) where.agentKeys = { has: query.agentKey };
  if (query.search?.trim()) {
    where.searchText = { contains: query.search.trim().toLowerCase(), mode: 'insensitive' };
  }

  if (cursor) {
    where.OR = [
      { at: { lt: new Date(cursor.at) } },
      {
        at: new Date(cursor.at),
        kind: { gt: cursor.kind },
      },
      {
        at: new Date(cursor.at),
        kind: cursor.kind,
        itemId: { lt: cursor.id },
      },
    ];
  }

  return where;
}

async function fetchFeedMeta(tenantId: string): Promise<OverviewFeedMeta> {
  const [pendingApprovals, proactiveCount, activeGoals] = await Promise.all([
    countPendingApprovals(tenantId),
    prisma.proactiveSuggestion.count({ where: { tenantId, status: 'active' } }),
    prisma.merchantGoal.count({ where: { tenantId, status: 'active' } }),
  ]);
  return { pendingApprovals, proactiveCount, activeGoals };
}

async function buildOverviewFeedFromDb(query: OverviewFeedQuery): Promise<OverviewFeedResponse> {
  const limit = Math.min(Math.max(query.limit ?? 25, 1), 50);
  const days = query.days ?? 7;
  const since = resolveActivitySince(days);
  const cursor = decodeOverviewCursor(query.cursor);
  const where = buildDbWhere(query, since, cursor);

  const rows = await prisma.overviewFeedEvent.findMany({
    where: where as never,
    orderBy: [{ at: 'desc' }, { kind: 'asc' }, { itemId: 'desc' }],
    take: limit + 1,
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const items = page.map(rowToFeedItem);

  for (const item of items) {
    item.cursor = encodeOverviewCursor({ at: item.at, id: item.id, kind: item.kind });
  }

  const last = items[items.length - 1];
  const meta = await fetchFeedMeta(query.tenantId);

  return {
    items,
    nextCursor: hasMore && last ? last.cursor : null,
    hasMore,
    meta,
  };
}

async function buildOverviewFeedLegacy(
  query: OverviewFeedQuery,
  proactiveDtos: ProactiveSuggestionDto[],
): Promise<OverviewFeedResponse> {
  const limit = Math.min(Math.max(query.limit ?? 25, 1), 50);
  const days = query.days ?? 7;
  const since = resolveActivitySince(days);
  const cursor = decodeOverviewCursor(query.cursor);

  const [activityFeed, pendingApprovals, approvalRows, goalRows, proactiveRows] =
    await Promise.all([
      buildActivityFeed({
        tenantId: query.tenantId,
        since,
        limit: SOURCE_BATCH,
        module: query.module,
        agentKey: query.agentKey,
      }),
      countPendingApprovals(query.tenantId),
      prisma.approval.findMany({
        where: { tenantId: query.tenantId, status: 'pending' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.merchantGoal.findMany({
        where: { tenantId: query.tenantId, status: 'active' },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          targetValue: true,
          currentValue: true,
          deadline: true,
          updatedAt: true,
        },
      }),
      prisma.proactiveSuggestion.findMany({
        where: { tenantId: query.tenantId, status: 'active' },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: 20,
      }),
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

export async function buildOverviewFeed(
  query: OverviewFeedQuery,
  proactiveDtos: ProactiveSuggestionDto[],
): Promise<OverviewFeedResponse> {
  if (isOverviewFeedReadLegacy()) {
    return buildOverviewFeedLegacy(query, proactiveDtos);
  }

  try {
    const dbFeed = await buildOverviewFeedFromDb(query);
    if (dbFeed.items.length > 0 || query.cursor) {
      return dbFeed;
    }
    const count = await prisma.overviewFeedEvent.count({
      where: { tenantId: query.tenantId },
    });
    if (count > 0) return dbFeed;
  } catch {
    return buildOverviewFeedLegacy(query, proactiveDtos);
  }

  return buildOverviewFeedLegacy(query, proactiveDtos);
}

export async function listOverviewFeedEventsSince(
  tenantId: string,
  sinceCursor: OverviewCursor | null,
  limit = 50,
): Promise<OverviewFeedItem[]> {
  const since = sinceCursor ? new Date(sinceCursor.at) : new Date(Date.now() - 60_000);
  const rows = await prisma.overviewFeedEvent.findMany({
    where: {
      tenantId,
      visible: true,
      at: { gte: since },
    },
    orderBy: { at: 'desc' },
    take: limit,
  });
  return rows.map(rowToFeedItem).map((item) => ({
    ...item,
    cursor: encodeOverviewCursor({ at: item.at, id: item.id, kind: item.kind }),
  }));
}

/** Build overview highlight path for notifications. */
export function overviewHighlightHref(
  kind: 'activity' | 'approval' | 'proactive' | 'section' | 'goal' | 'handoff',
  id: string,
): string {
  return `/overview?highlight=${encodeURIComponent(`${kind}:${id}`)}`;
}
