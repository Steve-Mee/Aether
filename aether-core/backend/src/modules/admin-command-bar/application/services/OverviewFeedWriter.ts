import type { OverviewFeedEventType } from './OverviewFeedEmitter';
import type { OverviewFeedItem, OverviewFeedKind } from './OverviewFeedService';
import type { ActivityFeedItem } from './ActivityFeedService';
import type { OverviewFeedPort } from '../ports/OverviewFeedPort';

export interface FeedEventMeta {
  sourceType: string;
  sourceId: string;
  module?: string | null;
  riskLevel?: string | null;
  executionMode?: string | null;
  agentKeys?: string[];
  searchText?: string | null;
}

function buildSearchText(payload: Record<string, unknown>, kind: OverviewFeedKind): string {
  const parts: string[] = [];
  for (const key of [
    'label',
    'title',
    'description',
    'actionLabel',
    'command',
    'module',
    'actionType',
    'intent',
    'summary',
  ]) {
    const v = payload[key];
    if (typeof v === 'string' && v.trim()) parts.push(v);
  }
  if (kind === 'agent_handoff') {
    const from = payload.fromAgentKey;
    const to = payload.toAgentKey;
    if (typeof from === 'string') parts.push(from);
    if (typeof to === 'string') parts.push(to);
  }
  return parts.join(' ').toLowerCase().slice(0, 500);
}

function metaFromActivity(activity: ActivityFeedItem): FeedEventMeta {
  return {
    sourceType: activity.source === 'command' ? 'command' : 'audit_log',
    sourceId: activity.id.replace(/^(audit-|command-)/, ''),
    module: activity.module,
    riskLevel: activity.risk,
    executionMode:
      activity.status === 'autonomous'
        ? 'autonomous'
        : activity.status === 'pending'
          ? 'approval_required'
          : 'inform_only',
    agentKeys: activity.agentKeys ?? [],
    searchText: `${activity.actionLabel} ${activity.description} ${activity.module}`.toLowerCase(),
  };
}

function metaFromPayload(
  kind: OverviewFeedKind,
  itemId: string,
  payload: Record<string, unknown>,
): FeedEventMeta {
  if (kind === 'activity') {
    return metaFromActivity(payload as unknown as ActivityFeedItem);
  }
  const sourceType =
    kind === 'proactive'
      ? 'proactive_suggestion'
      : kind === 'approval'
        ? 'approval'
        : kind === 'goal_snapshot' || kind === 'goal_completed'
          ? 'merchant_goal'
          : kind === 'agent_handoff'
            ? 'reflection_handoff'
            : 'unknown';
  return {
    sourceType,
    sourceId: itemId,
    module: typeof payload.module === 'string' ? payload.module : null,
    riskLevel:
      typeof payload.riskLevel === 'string'
        ? payload.riskLevel
        : typeof payload.risk === 'string'
          ? payload.risk
          : null,
    executionMode: typeof payload.executionMode === 'string' ? payload.executionMode : null,
    agentKeys:
      typeof payload.agentKey === 'string'
        ? [payload.agentKey]
        : Array.isArray(payload.agentKeys)
          ? payload.agentKeys.filter((k): k is string => typeof k === 'string')
          : typeof payload.fromAgentKey === 'string'
            ? [payload.fromAgentKey, ...(typeof payload.toAgentKey === 'string' ? [payload.toAgentKey] : [])]
            : [],
    searchText: buildSearchText(payload, kind),
  };
}

export function buildIdempotencyKey(kind: OverviewFeedKind, itemId: string): string {
  return `${kind}:${itemId}`;
}

export class OverviewFeedWriterService {
  constructor(private overviewFeedPort: OverviewFeedPort) {}

  async upsertFeedEvent(
    tenantId: string,
    eventType: OverviewFeedEventType,
    item: OverviewFeedItem,
    metaOverride?: Partial<FeedEventMeta>,
  ): Promise<{ id: string }> {
    const meta = { ...metaFromPayload(item.kind, item.id, item.payload), ...metaOverride };
    const idempotencyKey = buildIdempotencyKey(item.kind, item.id);
    const visible = eventType !== 'removed';

    return this.overviewFeedPort.upsertFeedEvent({
      tenantId,
      kind: item.kind,
      itemId: item.id,
      at: new Date(item.at),
      eventType,
      visible,
      payload: item.payload as object,
      sourceType: meta.sourceType ?? 'unknown',
      sourceId: meta.sourceId ?? item.id,
      idempotencyKey,
      module: meta.module ?? null,
      riskLevel: meta.riskLevel ?? null,
      executionMode: meta.executionMode ?? null,
      agentKeys: meta.agentKeys ?? [],
      searchText: meta.searchText ?? null,
    });
  }
}
