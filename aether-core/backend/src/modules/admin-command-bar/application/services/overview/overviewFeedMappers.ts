import type { ProactiveSuggestionDto } from '../../../../../ai/intelligence/proactive/ProactiveSuggestionService';
import {
  type ActivityFeedItem,
  itemMatchesAgentKey,
} from '../ActivityFeedService';
import type { OverviewFeedItem, OverviewFeedKind, OverviewFeedQuery } from './overviewFeedTypes';

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

export function proactiveToItem(dto: ProactiveSuggestionDto, createdAt: string): OverviewFeedItem {
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

export function applyActivityFilters(item: ActivityFeedItem, query: OverviewFeedQuery): boolean {
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

export function applyProactiveFilters(dto: ProactiveSuggestionDto, query: OverviewFeedQuery): boolean {
  if (query.actionType === 'autonomous' || query.actionType === 'approval' || query.actionType === 'goal') {
    return false;
  }
  if (query.agentKey && dto.agentKey && dto.agentKey !== query.agentKey) return false;
  if (query.risk === 'high' && dto.riskLevel !== 'high') return false;
  if (query.risk === 'low' && dto.riskLevel === 'high') return false;
  if (query.executionMode && dto.executionMode !== query.executionMode) return false;
  return matchesSearch(`${dto.label} ${dto.command} ${dto.hint ?? ''}`, query.search);
}

export function rowToFeedItem(row: {
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

export { matchesSearch };
