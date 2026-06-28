import type { ActivityItem } from '@/types/activity';

export type OverviewFeedKind = 'activity' | 'proactive' | 'approval' | 'goal_snapshot';

export interface OverviewFeedItem {
  kind: OverviewFeedKind;
  at: string;
  id: string;
  cursor: string;
  payload: Record<string, unknown>;
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

export interface OverviewFeedParams {
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

export type OverviewHighlightKind = 'activity' | 'approval' | 'proactive' | 'section';

export function activityFromOverviewItem(item: OverviewFeedItem): ActivityItem | null {
  if (item.kind !== 'activity') return null;
  return item.payload as unknown as ActivityItem;
}
