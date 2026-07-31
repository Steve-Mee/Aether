export interface OverviewFeedEventRecord {
  id: string;
  kind: string;
  itemId: string;
  at: Date;
  payload: unknown;
  createdAt?: Date;
  emailDispatchedAt?: Date | null;
}

export interface OverviewFeedQueryFilter {
  tenantId: string;
  since: Date;
  cursor?: { at: string; id: string; kind: string } | null;
  kind?: string;
  riskLevel?: string;
  module?: string;
  executionMode?: string;
  agentKey?: string;
  search?: string;
  actionType?: 'proactive' | 'approval' | 'goal' | 'autonomous';
}

export interface ApprovalFeedRecord {
  id: string;
  module: string;
  actionType: string;
  status: string;
  createdAt: Date;
  payload: string | null;
}

export interface GoalFeedRecord {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number | null;
  deadline: Date;
  updatedAt: Date;
}

export interface ProactiveFeedRecord {
  id: string;
  createdAt: Date;
}

export interface UpsertOverviewFeedEventInput {
  tenantId: string;
  kind: string;
  itemId: string;
  at: Date;
  eventType: string;
  visible: boolean;
  payload: object;
  sourceType: string;
  sourceId: string;
  idempotencyKey: string;
  module?: string | null;
  riskLevel?: string | null;
  executionMode?: string | null;
  agentKeys: string[];
  searchText?: string | null;
}

export interface OverviewFeedPort {
  findFeedEvents(filter: OverviewFeedQueryFilter, take: number): Promise<OverviewFeedEventRecord[]>;

  countFeedEvents(tenantId: string): Promise<number>;

  findFeedEventsSince(
    tenantId: string,
    since: Date,
    limit: number,
  ): Promise<OverviewFeedEventRecord[]>;

  findFeedEventsByKinds(
    tenantId: string,
    kinds: string[],
    since: Date,
    limit: number,
  ): Promise<OverviewFeedEventRecord[]>;

  upsertFeedEvent(input: UpsertOverviewFeedEventInput): Promise<{ id: string }>;

  markEmailDispatched(feedEventId: string): Promise<void>;

  markManyEmailDispatched(feedEventIds: string[]): Promise<void>;

  findUndispatchedForDigest(
    tenantId: string,
    since: Date,
    limit: number,
  ): Promise<OverviewFeedEventRecord[]>;

  countActiveProactiveSuggestions(tenantId: string): Promise<number>;

  countActiveGoals(tenantId: string): Promise<number>;

  findPendingApprovals(tenantId: string, limit: number): Promise<ApprovalFeedRecord[]>;

  findApprovalsSince(tenantId: string, since: Date, limit: number): Promise<ApprovalFeedRecord[]>;

  findActiveGoals(tenantId: string, limit: number): Promise<GoalFeedRecord[]>;

  findActiveGoalsUpdatedSince(
    tenantId: string,
    since: Date,
    limit: number,
  ): Promise<GoalFeedRecord[]>;

  findActiveProactiveSuggestions(tenantId: string, limit: number): Promise<ProactiveFeedRecord[]>;

  findActiveProactiveForInbox(tenantId: string, limit: number): Promise<
    Array<{
      id: string;
      title: string;
      summary: string | null;
      command: string;
      triggerId: string;
      priority: number;
      riskLevel: string | null;
      createdAt: Date;
    }>
  >;
}
