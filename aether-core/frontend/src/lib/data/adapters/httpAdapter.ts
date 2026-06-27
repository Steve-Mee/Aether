import { apiFetch, apiRoutes } from '@/lib/api';
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
import type {
  AutonomyTraceResponse,
  DataAdapter,
  ExplainTimeline,
  ActivityFetchParams,
} from './DataAdapter';
import type { ApiSuggestionsResponse } from '@/types/suggestions';

export const httpDataAdapter: DataAdapter = {
  fetchApprovals: () => apiFetch<ApprovalItem[]>(apiRoutes.approvals.list),

  resolveApproval: (id, approve) =>
    apiFetch<ResolveApprovalResponse>(apiRoutes.approvals.resolve(id), {
      method: 'POST',
      body: JSON.stringify({ approve }),
    }),

  autoApplyApprovals: () =>
    apiFetch<AutoApplyApprovalsResponse>(apiRoutes.approvals.autoApply, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  fetchActivity: (params?: ActivityFetchParams) =>
    apiFetch<ActivityFeedResponse>(apiRoutes.admin.activity(params)),

  fetchSuppliersOverview: () => apiFetch<SupplierOverviewApiResponse>(apiRoutes.suppliers.overview),

  fetchSupplierDetail: async (id) => {
    try {
      const d = await apiFetch<SupplierDetail>(apiRoutes.suppliers.detail(id));
      return { ...d, recentSyncs: d.recentSyncs ?? [] };
    } catch {
      return null;
    }
  },

  patchSupplier: (id, patch) =>
    apiFetch<SupplierDetail>(apiRoutes.suppliers.patch(id), {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  monitorSupplier: (id) =>
    apiFetch<{ supplier: SupplierDetail; productsFound: number; changes: number }>(
      apiRoutes.suppliers.monitor(id),
      { method: 'POST' },
    ),

  createSupplier: (body) =>
    apiFetch<SupplierDetail>(apiRoutes.suppliers.create, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  fetchSupplierChanges: (status = 'pending') =>
    apiFetch<SupplierChangeRow[]>(apiRoutes.suppliers.changes(status)),

  fetchOutcomeReport: (days) => apiFetch<OutcomeReport>(apiRoutes.outcomes.report(days)),

  fetchAutonomyMetrics: (days) => apiFetch<AutonomyMetricsResponse>(apiRoutes.admin.autonomy(days)),

  fetchBillingSummary: (days) => apiFetch<BillingSummary>(apiRoutes.outcomes.billing(days)),

  reconcileBilling: () =>
    apiFetch<{ success: boolean }>(apiRoutes.outcomes.billingReconcile, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  executeCommand: (command) =>
    apiFetch<CommandResult>(apiRoutes.admin.command, {
      method: 'POST',
      body: JSON.stringify({ command: command.trim() }),
    }),

  undoCommand: (commandId) =>
    apiFetch<UndoCommandResponse>(apiRoutes.admin.commandUndo(commandId), { method: 'POST' }),

  executeToolProposal: (proposalId, commandId) =>
    apiFetch<ExecuteBrainToolResponse>(apiRoutes.admin.commandToolExecute, {
      method: 'POST',
      body: JSON.stringify({ proposalId, commandId }),
    }),

  rejectToolProposal: (proposalId) =>
    apiFetch<ExecuteBrainToolResponse>(apiRoutes.admin.commandToolReject, {
      method: 'POST',
      body: JSON.stringify({ proposalId }),
    }),

  fetchCommandHistory: async () => {
    const res = await apiFetch<{ commands: CommandHistoryItem[] }>(apiRoutes.admin.commands);
    return res.commands ?? [];
  },

  fetchAgentRun: (commandId) =>
    apiFetch<AgentRunResponse>(apiRoutes.admin.commandAgentRun(commandId)),

  fetchNotifications: async () => {
    const res = await apiFetch<{ notifications: AppNotification[] }>(
      apiRoutes.admin.notifications(),
    );
    return res.notifications ?? [];
  },

  markNotificationRead: (id) =>
    apiFetch<void>(apiRoutes.admin.notificationRead(id), { method: 'PATCH' }),

  markAllNotificationsRead: (ids) =>
    apiFetch<void>(apiRoutes.admin.notificationsMarkAllRead, {
      method: 'POST',
      body: JSON.stringify(ids ? { ids } : {}),
    }),

  dismissNotification: (id) =>
    apiFetch<void>(apiRoutes.admin.notificationDismiss(id), { method: 'DELETE' }),

  fetchOrders: () => apiFetch<OrderRowDemo[]>(apiRoutes.orders.list),

  fetchProducts: () => apiFetch<ProductRowDemo[]>(apiRoutes.products.list),

  fetchEmails: () => apiFetch<EmailRowDemo[]>(apiRoutes.emails.list),

  fetchEmailDetail: (id) => apiFetch<EmailDetail>(apiRoutes.emails.detail(id)),

  fetchNegotiations: async () => {
    const res = await apiFetch<{ negotiations: NegotiationRowDemo[] }>(
      apiRoutes.agentic.negotiations,
    );
    return res.negotiations ?? [];
  },

  fetchAutonomousDecisions: () => apiFetch<AutonomousDecisionRowDemo[]>(apiRoutes.autonomous.list),

  fetchDashboard: () => apiFetch<DashboardSummary>(apiRoutes.admin.dashboard),

  fetchSettings: async () => {
    const res = await apiFetch<{ settings: MerchantSettings }>(apiRoutes.admin.settings);
    return res.settings;
  },

  updateSettings: async (patch) => {
    const res = await apiFetch<{ settings: MerchantSettings }>(apiRoutes.admin.settings, {
      method: 'PUT',
      body: JSON.stringify(patch),
    });
    return res.settings;
  },

  fetchConnectedServices: async () => {
    const res = await apiFetch<{ services: ConnectedService[] }>(apiRoutes.admin.connectedServices);
    return res.services;
  },

  fetchOperatingMetrics: () => apiFetch<OperatingMetrics>(apiRoutes.admin.operatingMetrics),

  fetchTruthStatus: () => apiFetch<TruthStatusDocument>(apiRoutes.admin.truthStatus),

  fetchExplainTimeline: (entityType, entityId) =>
    apiFetch<ExplainTimeline>(apiRoutes.admin.explain(entityType, entityId)),

  fetchAutonomyTrace: (limit = 30) =>
    apiFetch<AutonomyTraceResponse>(apiRoutes.admin.autonomyTrace(limit)),

  submitTruthReview: () =>
    apiFetch<{ success: boolean; message: string }>(apiRoutes.admin.truthReview, {
      method: 'POST',
    }),

  fetchSuggestions: (route, limit) =>
    apiFetch<ApiSuggestionsResponse>(apiRoutes.admin.suggestions(route, limit)),

  trackUiEvent: (event) =>
    apiFetch(apiRoutes.admin.uiEvent, {
      method: 'POST',
      body: JSON.stringify(event),
    }).then(() => undefined),
};
