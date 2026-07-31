import type {
  BillingSummary,
  ConnectedService,
  DashboardSummary,
  EmailDetail,
  OperatingMetrics,
  TruthStatusDocument,
} from '@/lib/api';
import type {
  ApprovalItem,
  AutoApplyApprovalsResponse,
  ResolveApprovalResponse,
} from '@/types/approval';
import type { ActivityFeedResponse } from '@/types/activity';
import type {
  CommandHistoryItem,
  CommandResult,
  ExecuteBrainToolResponse,
  UndoCommandResponse,
  AgentRunResponse,
} from '@/types/command';
import type { AutonomyMetricsResponse, OutcomeReport } from '@/types/insight';
import type { AppNotification } from '@/types/notification';
import type {
  SupplierChangeRow,
  SupplierDetail,
  SupplierOverviewApiResponse,
} from '@/types/supplier';
import type { MerchantSettings } from '@/lib/settings/merchantSettingsTypes';
import type { ExplainTimeline } from '@/types/explainability';
import type {
  OrderRow,
  ProductRow,
  EmailRow,
  NegotiationRow,
  AutonomousDecisionRow,
} from '@/lib/data/types';

export interface ActivityFetchParams {
  days?: number;
  since?: string;
  limit?: number;
  module?: string;
  agentKey?: string;
}

export type { ExplainTimeline } from '@/types/explainability';

export interface AutonomyTraceResponse {
  events: Array<{
    kind?: string;
    at?: string;
    label?: string;
    stage?: string;
    module?: string;
    workflow?: string;
    status?: string;
  }>;
}

export interface DataAdapter {
  fetchApprovals(): Promise<ApprovalItem[]>;
  resolveApproval(id: string, approve: boolean): Promise<ResolveApprovalResponse>;
  autoApplyApprovals(): Promise<AutoApplyApprovalsResponse>;

  fetchActivity(params?: ActivityFetchParams): Promise<ActivityFeedResponse>;

  fetchSuppliersOverview(): Promise<SupplierOverviewApiResponse>;
  fetchSupplierDetail(id: string): Promise<SupplierDetail | null>;
  patchSupplier(
    id: string,
    patch: Partial<{ autoSyncEnabled: boolean; status: string }>,
  ): Promise<SupplierDetail>;
  monitorSupplier(id: string): Promise<{
    supplier: SupplierDetail;
    productsFound: number;
    changes: number;
  }>;
  createSupplier(body: { name: string; website: string }): Promise<SupplierDetail>;
  fetchSupplierChanges(status?: string): Promise<SupplierChangeRow[]>;

  fetchOutcomeReport(days: number): Promise<OutcomeReport>;
  fetchAutonomyMetrics(days: number): Promise<AutonomyMetricsResponse>;
  fetchBillingSummary(days: number): Promise<BillingSummary>;
  reconcileBilling(): Promise<{ success: boolean }>;

  executeCommand(command: string): Promise<CommandResult>;
  undoCommand(commandId: string): Promise<UndoCommandResponse>;
  executeToolProposal(proposalId: string, commandId?: string): Promise<ExecuteBrainToolResponse>;
  rejectToolProposal(proposalId: string): Promise<ExecuteBrainToolResponse>;
  fetchCommandHistory(): Promise<CommandHistoryItem[]>;
  fetchAgentRun(commandId: string): Promise<AgentRunResponse>;
  cancelAgentRun(commandId: string): Promise<{ success: boolean }>;

  fetchNotifications(): Promise<AppNotification[]>;
  fetchNotificationsPage(params: {
    limit?: number;
    cursor?: string;
    groupKey?: string;
  }): Promise<import('@/types/notification').NotificationInboxResponse>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(ids?: string[]): Promise<void>;
  dismissNotification(id: string): Promise<void>;

  fetchOrders(): Promise<OrderRow[]>;
  fetchProducts(): Promise<ProductRow[]>;
  fetchEmails(): Promise<EmailRow[]>;
  fetchEmailDetail(id: string): Promise<EmailDetail | null>;
  fetchNegotiations(): Promise<NegotiationRow[]>;
  fetchAutonomousDecisions(): Promise<AutonomousDecisionRow[]>;

  fetchDashboard(): Promise<DashboardSummary>;
  fetchSettings(): Promise<MerchantSettings>;
  updateSettings(patch: Partial<MerchantSettings>): Promise<MerchantSettings>;
  fetchConnectedServices(): Promise<ConnectedService[]>;
  fetchOperatingMetrics(): Promise<OperatingMetrics>;
  fetchTruthStatus(): Promise<TruthStatusDocument>;

  fetchExplainTimeline(entityType: string, entityId: string): Promise<ExplainTimeline>;
  fetchAutonomyTrace(limit?: number): Promise<AutonomyTraceResponse>;
  submitTruthReview(): Promise<{ success: boolean; message: string }>;
  fetchSuggestions(
    route: string,
    limit: number,
  ): Promise<import('@/types/suggestions').ApiSuggestionsResponse>;
  fetchProactiveSuggestions(): Promise<
    import('@/types/suggestions').ApiProactiveSuggestionsResponse
  >;
  dismissProactiveSuggestion(id: string): Promise<void>;
  snoozeProactiveSuggestion(id: string, hours?: number): Promise<void>;
  executeProactiveSuggestion(id: string): Promise<void>;
  trackUiEvent(event: { type: string; path: string }): Promise<void>;
  fetchGoals(includeCompleted?: boolean): Promise<import('@/types/goals').GoalsListResponse>;
  fetchGoal(id: string): Promise<import('@/types/goals').GoalDetailResponse>;
  createGoal(
    payload: import('@/types/goals').CreateGoalPayload,
  ): Promise<{ goal: import('@/types/goals').MerchantGoal }>;
  updateGoal(
    id: string,
    payload: import('@/types/goals').UpdateGoalPayload,
  ): Promise<{ goal: import('@/types/goals').MerchantGoal }>;
  deleteGoal(id: string): Promise<void>;
  refreshGoal(id: string): Promise<unknown>;
  fetchGoalLinkedSuggestions(
    id: string,
  ): Promise<import('@/types/goals').GoalLinkedSuggestionsResponse>;
  fetchAiGoalSuggestions(): Promise<import('@/types/goals').AiGoalSuggestionsResponse>;
  acceptAiGoalSuggestion(id: string): Promise<{ goal: import('@/types/goals').MerchantGoal }>;
  dismissAiGoalSuggestion(id: string): Promise<void>;
  fetchGoalConflicts(): Promise<import('@/types/goals').GoalConflictsResponse>;
  buildGoalPlan(): Promise<{ plan: unknown }>;
  fetchActiveGoalPlan(): Promise<{ plan: unknown | null }>;
}
