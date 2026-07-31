import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { mapAuditRowToActivityItem } from './ActivityFeedService';
import type { ActivityFeedItem } from './ActivityFeedService';
import { overviewFeedEmitter, type OverviewFeedEventType } from './OverviewFeedEmitter';
import {
  encodeOverviewCursor,
  type OverviewFeedItem,
  type OverviewFeedKind,
} from './OverviewFeedService';
import { mapOverviewFeedItemToNotification } from './notifications/notificationMappers';
import { notificationEmitter } from './notifications/NotificationEmitter';

function withCursor(
  kind: OverviewFeedKind,
  at: string,
  id: string,
  payload: Record<string, unknown>,
): OverviewFeedItem {
  const item: OverviewFeedItem = { kind, at, id, cursor: '', payload };
  item.cursor = encodeOverviewCursor({ at, id, kind });
  return item;
}

export async function notifyOverviewFeedItem(
  tenantId: string,
  event: OverviewFeedEventType,
  item: OverviewFeedItem,
): Promise<void> {
  try {
    const { overviewFeedWriter, overviewNotificationDispatcher } = getCompositionRoot();
    const persisted = await overviewFeedWriter.upsertFeedEvent(tenantId, event, item);
    overviewFeedEmitter.emit(tenantId, event, item);
    if (event === 'created') {
      void overviewNotificationDispatcher.onFeedEventCreated(tenantId, persisted.id, item);
      const mapped = mapOverviewFeedItemToNotification(item);
      if (mapped) {
        void notificationEmitter.emit(tenantId, mapped, { sourceType: item.kind, sourceId: item.id });
      }
    }
  } catch {
    overviewFeedEmitter.emit(tenantId, event, item);
    if (event === 'created') {
      const mapped = mapOverviewFeedItemToNotification(item);
      if (mapped) {
        void notificationEmitter.emit(tenantId, mapped, { sourceType: item.kind, sourceId: item.id });
      }
    }
  }
}

export function notifyOverviewActivity(
  tenantId: string,
  activity: ActivityFeedItem,
  event: OverviewFeedEventType = 'created',
): void {
  void notifyOverviewFeedItem(
    tenantId,
    event,
    withCursor('activity', activity.at, activity.id, activity as unknown as Record<string, unknown>),
  );
}

export function notifyOverviewFromAuditRow(
  tenantId: string,
  row: {
    id: string;
    module: string;
    action: string;
    actor: string | null;
    details: string | null;
    createdAt: Date;
  },
): void {
  notifyOverviewActivity(tenantId, mapAuditRowToActivityItem(row));
}

export function notifyOverviewApproval(
  tenantId: string,
  event: OverviewFeedEventType,
  row: {
    id: string;
    module: string;
    actionType: string;
    status: string;
    createdAt: Date;
    payload?: string | null;
    resolvedAt?: Date | null;
  },
): void {
  let payload: Record<string, unknown> = {};
  if (row.payload) {
    try {
      payload = JSON.parse(row.payload) as Record<string, unknown>;
    } catch {
      payload = {};
    }
  }
  const at = (row.resolvedAt ?? row.createdAt).toISOString();
  const feedEvent: OverviewFeedEventType =
    row.status !== 'pending' && event === 'updated' ? 'removed' : event;
  void notifyOverviewFeedItem(
    tenantId,
    feedEvent,
    withCursor('approval', at, row.id, {
      id: row.id,
      module: row.module,
      actionType: row.actionType,
      status: row.status,
      ...payload,
    }),
  );
}

export function notifyOverviewProactive(
  tenantId: string,
  event: OverviewFeedEventType,
  record: {
    id: string;
    title: string;
    command: string;
    intentId: string;
    category: string;
    executionMode: string;
    triggerId: string;
    agentKey?: string | null;
    riskLevel?: string | null;
    goalId?: string | null;
    createdAt: Date;
    updatedAt?: Date;
  },
): void {
  const at = (record.updatedAt ?? record.createdAt).toISOString();
  void notifyOverviewFeedItem(
    tenantId,
    event,
    withCursor('proactive', at, record.id, {
      id: record.id,
      label: record.title,
      command: record.command,
      intentId: record.intentId,
      category: record.category,
      executionMode: record.executionMode,
      triggerId: record.triggerId,
      agentKey: record.agentKey ?? undefined,
      riskLevel: record.riskLevel ?? undefined,
      goalId: record.goalId ?? undefined,
      source: 'proactive',
    }),
  );
}

export function notifyOverviewHandoff(
  tenantId: string,
  handoff: {
    id: string;
    at: string;
    fromAgentKey: string;
    toAgentKey: string;
    mode: 'sync' | 'async';
    status: string;
    intent?: string;
    summary?: string;
    correlationId?: string;
    parentRunId?: string | null;
  },
): void {
  void notifyOverviewFeedItem(
    tenantId,
    'created',
    withCursor('agent_handoff', handoff.at, handoff.id, {
      ...handoff,
      fromAgentKey: handoff.fromAgentKey,
      toAgentKey: handoff.toAgentKey,
    }),
  );
}

export function notifyOverviewGoalSnapshot(
  tenantId: string,
  goal: {
    id: string;
    title: string;
    targetValue: number;
    currentValue: number | null;
    deadline: Date;
    updatedAt: Date;
  },
): void {
  const progressPct =
    goal.currentValue != null && goal.targetValue > 0
      ? Math.round((goal.currentValue / goal.targetValue) * 100)
      : null;
  void notifyOverviewFeedItem(
    tenantId,
    'created',
    withCursor('goal_snapshot', goal.updatedAt.toISOString(), goal.id, {
      id: goal.id,
      title: goal.title,
      progressPct,
      deadline: goal.deadline.toISOString(),
    }),
  );
}

export function notifyOverviewGoalMilestone(
  tenantId: string,
  goal: {
    id: string;
    title: string;
    progressPct: number;
    milestoneThreshold: number;
    updatedAt: Date;
  },
): void {
  void notifyOverviewFeedItem(
    tenantId,
    'created',
    withCursor('goal_snapshot', goal.updatedAt.toISOString(), goal.id, {
      id: goal.id,
      title: goal.title,
      progressPct: goal.progressPct,
      milestoneThreshold: goal.milestoneThreshold,
      isMilestone: true,
    }),
  );
}

export function notifyOverviewGoalCompleted(
  tenantId: string,
  goal: {
    id: string;
    title: string;
    completedAt: Date;
  },
): void {
  void notifyOverviewFeedItem(
    tenantId,
    'created',
    withCursor('goal_completed', goal.completedAt.toISOString(), goal.id, {
      id: goal.id,
      title: goal.title,
    }),
  );
}
