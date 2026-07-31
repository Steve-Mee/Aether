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
