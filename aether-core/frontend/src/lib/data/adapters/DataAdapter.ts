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
import type { CommandHistoryItem, CommandResult, ExecuteBrainToolResponse, UndoCommandResponse, AgentRunResponse } from '@/types/command';
import type { AutonomyMetricsResponse, OutcomeReport } from '@/types/insight';
import type { AppNotification } from '@/types/notification';
import type {
  SupplierChangeRow,
  SupplierDetail,
  SupplierOverviewApiResponse,
} from '@/types/supplier';
import type { MerchantSettings } from '@/lib/settings/merchantSettingsTypes';
import type { OrderRowDemo } from '@/lib/ordersPageDemo';
import type { ProductRowDemo } from '@/lib/productsPageDemo';
import type { EmailRowDemo } from '@/lib/emailsPageDemo';
import type { NegotiationRowDemo } from '@/lib/negotiationsPageDemo';
import type { AutonomousDecisionRowDemo } from '@/lib/autonomousPageDemo';

export interface ActivityFetchParams {
  days?: number;
  since?: string;
  limit?: number;
  module?: string;
}

export interface ExplainTimeline {
  entityType: string;
  entityId: string;
  events: Array<{
    at: string;
    label: string;
    status?: string;
    module?: string;
    actor?: string;
    category?: string;
    actionType?: string;
    details?: unknown;
  }>;
}

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

  fetchNotifications(): Promise<AppNotification[]>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(ids?: string[]): Promise<void>;
  dismissNotification(id: string): Promise<void>;

  fetchOrders(): Promise<OrderRowDemo[]>;
  fetchProducts(): Promise<ProductRowDemo[]>;
  fetchEmails(): Promise<EmailRowDemo[]>;
  fetchEmailDetail(id: string): Promise<EmailDetail | null>;
  fetchNegotiations(): Promise<NegotiationRowDemo[]>;
  fetchAutonomousDecisions(): Promise<AutonomousDecisionRowDemo[]>;

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
  trackUiEvent(event: { type: string; path: string }): Promise<void>;
}
