import { prisma } from '../../../../shared/prisma/client';
import type {
  OverviewFeedPort,
  OverviewFeedQueryFilter,
  UpsertOverviewFeedEventInput,
} from '../../application/ports/OverviewFeedPort';

function buildDbWhere(filter: OverviewFeedQueryFilter) {
  const where: Record<string, unknown> = {
    tenantId: filter.tenantId,
    visible: true,
    at: { gte: filter.since },
  };

  if (filter.actionType === 'proactive') where.kind = 'proactive';
  else if (filter.actionType === 'approval') where.kind = 'approval';
  else if (filter.actionType === 'goal') where.kind = 'goal_snapshot';
  else if (filter.actionType === 'autonomous') {
    where.kind = 'activity';
    where.executionMode = 'autonomous';
  } else if (filter.kind) {
    where.kind = filter.kind;
  }

  if (filter.riskLevel) where.riskLevel = filter.riskLevel;
  if (filter.module) where.module = filter.module;
  if (filter.executionMode) where.executionMode = filter.executionMode;
  if (filter.agentKey) where.agentKeys = { has: filter.agentKey };
  if (filter.search?.trim()) {
    where.searchText = { contains: filter.search.trim().toLowerCase(), mode: 'insensitive' };
  }

  if (filter.cursor) {
    where.OR = [
      { at: { lt: new Date(filter.cursor.at) } },
      {
        at: new Date(filter.cursor.at),
        kind: { gt: filter.cursor.kind },
      },
      {
        at: new Date(filter.cursor.at),
        kind: filter.cursor.kind,
        itemId: { lt: filter.cursor.id },
      },
    ];
  }

  return where;
}

export class PrismaOverviewFeedRepository implements OverviewFeedPort {
  async findFeedEvents(filter: OverviewFeedQueryFilter, take: number) {
    return prisma.overviewFeedEvent.findMany({
      where: buildDbWhere(filter) as never,
      orderBy: [{ at: 'desc' }, { kind: 'asc' }, { itemId: 'desc' }],
      take,
    });
  }

  countFeedEvents(tenantId: string): Promise<number> {
    return prisma.overviewFeedEvent.count({ where: { tenantId } });
  }

  findFeedEventsSince(tenantId: string, since: Date, limit: number) {
    return prisma.overviewFeedEvent.findMany({
      where: {
        tenantId,
        visible: true,
        at: { gte: since },
      },
      orderBy: { at: 'desc' },
      take: limit,
    });
  }

  findFeedEventsByKinds(tenantId: string, kinds: string[], since: Date, limit: number) {
    return prisma.overviewFeedEvent.findMany({
      where: {
        tenantId,
        visible: true,
        kind: { in: kinds },
        at: { gte: since },
      },
      orderBy: { at: 'desc' },
      take: limit,
    });
  }

  async upsertFeedEvent(input: UpsertOverviewFeedEventInput): Promise<{ id: string }> {
    const row = await prisma.overviewFeedEvent.upsert({
      where: { idempotencyKey: input.idempotencyKey },
      create: {
        tenantId: input.tenantId,
        kind: input.kind,
        itemId: input.itemId,
        at: input.at,
        eventType: input.eventType,
        visible: input.visible,
        payload: input.payload,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        idempotencyKey: input.idempotencyKey,
        module: input.module ?? null,
        riskLevel: input.riskLevel ?? null,
        executionMode: input.executionMode ?? null,
        agentKeys: input.agentKeys,
        searchText: input.searchText ?? null,
      },
      update: {
        at: input.at,
        eventType: input.eventType,
        visible: input.visible,
        payload: input.payload,
        module: input.module ?? null,
        riskLevel: input.riskLevel ?? null,
        executionMode: input.executionMode ?? null,
        agentKeys: input.agentKeys,
        searchText: input.searchText ?? null,
      },
    });
    return { id: row.id };
  }

  async markEmailDispatched(feedEventId: string): Promise<void> {
    await prisma.overviewFeedEvent.update({
      where: { id: feedEventId },
      data: { emailDispatchedAt: new Date() },
    });
  }

  async markManyEmailDispatched(feedEventIds: string[]): Promise<void> {
    await prisma.overviewFeedEvent.updateMany({
      where: { id: { in: feedEventIds } },
      data: { emailDispatchedAt: new Date() },
    });
  }

  findUndispatchedForDigest(tenantId: string, since: Date, limit: number) {
    return prisma.overviewFeedEvent.findMany({
      where: {
        tenantId,
        visible: true,
        emailDispatchedAt: null,
        createdAt: { gte: since },
      },
      orderBy: { at: 'desc' },
      take: limit,
    });
  }

  countActiveProactiveSuggestions(tenantId: string): Promise<number> {
    return prisma.proactiveSuggestion.count({ where: { tenantId, status: 'active' } });
  }

  countActiveGoals(tenantId: string): Promise<number> {
    return prisma.merchantGoal.count({ where: { tenantId, status: 'active' } });
  }

  findPendingApprovals(tenantId: string, limit: number) {
    return prisma.approval.findMany({
      where: { tenantId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  findApprovalsSince(tenantId: string, since: Date, limit: number) {
    return prisma.approval.findMany({
      where: { tenantId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  findActiveGoals(tenantId: string, limit: number) {
    return prisma.merchantGoal.findMany({
      where: { tenantId, status: 'active' },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        targetValue: true,
        currentValue: true,
        deadline: true,
        updatedAt: true,
      },
    });
  }

  findActiveGoalsUpdatedSince(tenantId: string, since: Date, limit: number) {
    return prisma.merchantGoal.findMany({
      where: { tenantId, status: 'active', updatedAt: { gte: since } },
      take: limit,
      select: {
        id: true,
        title: true,
        targetValue: true,
        currentValue: true,
        deadline: true,
        updatedAt: true,
      },
    });
  }

  findActiveProactiveSuggestions(tenantId: string, limit: number) {
    return prisma.proactiveSuggestion.findMany({
      where: { tenantId, status: 'active' },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: { id: true, createdAt: true },
    });
  }

  findActiveProactiveForInbox(tenantId: string, limit: number) {
    return prisma.proactiveSuggestion.findMany({
      where: { tenantId, status: 'active' },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        title: true,
        summary: true,
        command: true,
        triggerId: true,
        priority: true,
        riskLevel: true,
        createdAt: true,
      },
    });
  }
}
