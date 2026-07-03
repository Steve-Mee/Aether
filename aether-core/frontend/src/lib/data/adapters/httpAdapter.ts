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

  cancelAgentRun: (commandId) =>
    apiFetch<{ success: boolean }>(apiRoutes.admin.commandAgentRunCancel(commandId), {
      method: 'POST',
    }),

  fetchNotifications: async () => {
    const res = await apiFetch<import('@/types/notification').NotificationInboxResponse>(
      apiRoutes.admin.notifications(),
    );
    return res.notifications ?? [];
  },

  fetchNotificationsPage: async (params: {
    limit?: number;
    cursor?: string;
    groupKey?: string;
  }) => {
    return apiFetch<import('@/types/notification').NotificationInboxResponse>(
      apiRoutes.admin.notifications(params.limit ?? 25, params.cursor, params.groupKey),
    );
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

  fetchProactiveSuggestions: () =>
    apiFetch<import('@/types/suggestions').ApiProactiveSuggestionsResponse>(
      apiRoutes.admin.proactiveSuggestions,
    ),

  dismissProactiveSuggestion: (id) =>
    apiFetch(apiRoutes.admin.proactiveSuggestionDismiss(id), { method: 'POST' }).then(
      () => undefined,
    ),

  snoozeProactiveSuggestion: (id, hours) =>
    apiFetch(apiRoutes.admin.proactiveSuggestionSnooze(id), {
      method: 'POST',
      body: JSON.stringify(hours != null ? { hours } : {}),
    }).then(() => undefined),

  executeProactiveSuggestion: (id) =>
    apiFetch(apiRoutes.admin.proactiveSuggestionExecute(id), { method: 'POST' }).then(
      () => undefined,
    ),

  trackUiEvent: (event) =>
    apiFetch(apiRoutes.admin.uiEvent, {
      method: 'POST',
      body: JSON.stringify(event),
    }).then(() => undefined),

  fetchGoals: (includeCompleted) =>
    apiFetch<import('@/types/goals').GoalsListResponse>(apiRoutes.admin.goals(includeCompleted)),

  fetchGoal: (id) => apiFetch<import('@/types/goals').GoalDetailResponse>(apiRoutes.admin.goal(id)),

  createGoal: (payload) =>
    apiFetch<{ goal: import('@/types/goals').MerchantGoal }>(apiRoutes.admin.goals(), {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateGoal: (id, payload) =>
    apiFetch<{ goal: import('@/types/goals').MerchantGoal }>(apiRoutes.admin.goal(id), {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteGoal: (id) =>
    apiFetch(apiRoutes.admin.goal(id), { method: 'DELETE' }).then(() => undefined),

  refreshGoal: (id) => apiFetch(apiRoutes.admin.goalRefresh(id), { method: 'POST' }),

  fetchGoalLinkedSuggestions: (id) =>
    apiFetch<import('@/types/goals').GoalLinkedSuggestionsResponse>(
      apiRoutes.admin.goalSuggestions(id),
    ),

  fetchAiGoalSuggestions: () =>
    apiFetch<import('@/types/goals').AiGoalSuggestionsResponse>(apiRoutes.admin.aiGoalSuggestions),

  acceptAiGoalSuggestion: (id) =>
    apiFetch(apiRoutes.admin.aiGoalSuggestionAccept(id), { method: 'POST' }),

  dismissAiGoalSuggestion: (id) =>
    apiFetch(apiRoutes.admin.aiGoalSuggestionDismiss(id), { method: 'POST' }).then(() => undefined),

  fetchGoalConflicts: () =>
    apiFetch<import('@/types/goals').GoalConflictsResponse>(apiRoutes.admin.goalConflicts),

  buildGoalPlan: () => apiFetch<{ plan: unknown }>(apiRoutes.admin.goalPlan, { method: 'POST' }),

  fetchActiveGoalPlan: () => apiFetch<{ plan: unknown | null }>(apiRoutes.admin.goalPlanActive),
};
