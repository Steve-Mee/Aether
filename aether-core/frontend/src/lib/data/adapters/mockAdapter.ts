import { getActivityDemoItems, filterDemoByPeriod } from '@/lib/activityPageDemo';
import { getApprovalsDemoItems } from '@/lib/approvalsPageDemo';
import { getAutonomousDemoDecisions } from '@/lib/autonomousPageDemo';
import { buildDashboardDemoSummary } from '@/lib/dashboardPageDemo';
import { getEmailDemoDetail, getEmailsDemoList } from '@/lib/emailsPageDemo';
import { getInsightsDemoSnapshot } from '@/lib/insightsPageDemo.data';
import { getNegotiationsDemoItems } from '@/lib/negotiationsPageDemo';
import { getDemoNotificationSeed } from '@/lib/notifications/demoSeed';
import { getOrdersDemoItems } from '@/lib/ordersPageDemo';
import { getProductsDemoItems } from '@/lib/productsPageDemo';
import {
  getConnectedServicesDemo,
  getOperatingMetricsDemo,
  getSettingsDemo,
  getTruthStatusDemo,
  patchSettingsDemo,
  resetSettingsDemo,
} from '@/lib/settingsPageDemo';
import { getSupplierDemoDetail, getSuppliersDemoSnapshot } from '@/lib/suppliersPageDemo';
import type { BillingSummary } from '@/lib/api';
import type { ActivityFeedResponse } from '@/types/activity';
import type { CommandResult } from '@/types/command';
import type { AutonomyMetricsResponse, OutcomeReport } from '@/types/insight';
import type { SupplierChangeRow, SupplierDetail } from '@/types/supplier';

const mockNotificationRead = new Set<string>();
const mockNotificationDismissed = new Set<string>();
import type { DataAdapter, ActivityFetchParams, ExplainTimeline } from './DataAdapter';

let mockApprovals = getApprovalsDemoItems();
let mockCommandSeq = 0;
let mockOrders = getOrdersDemoItems();

/** Reset mutable mock state (tests). */
export function resetMockAdapterState(): void {
  mockApprovals = getApprovalsDemoItems();
  mockCommandSeq = 0;
  mockOrders = getOrdersDemoItems();
  resetSettingsDemo();
}

function mockCommandResult(command: string): CommandResult {
  mockCommandSeq += 1;
  const trimmed = command.trim();
  return {
    success: true,
    originalCommand: trimmed,
    result: `Mock uitgevoerd: ${trimmed}`,
    parsedIntent: 'mock.intent',
    action: 'mock_action',
    confidence: 0.92,
    timestamp: new Date().toISOString(),
    commandId: `mock-cmd-${mockCommandSeq}`,
    undoable: true,
    undoExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
  };
}

function mockExplainTimeline(entityType: string, entityId: string): ExplainTimeline {
  return {
    entityType,
    entityId,
    events: [
      {
        at: new Date().toISOString(),
        label: 'Mock explain event',
        status: 'completed',
        module: entityType,
        actor: 'aether',
      },
    ],
  };
}

export const mockDataAdapter: DataAdapter = {
  fetchApprovals: async () => [...mockApprovals],

  resolveApproval: async (id) => {
    mockApprovals = mockApprovals.filter((a) => a.id !== id);
    return { success: true };
  },

  autoApplyApprovals: async () => {
    const lowRisk = mockApprovals.filter((a) => !a.actionType.includes('refund'));
    const applied = lowRisk.length;
    const skipped = mockApprovals.length - applied;
    mockApprovals = mockApprovals.filter((a) => a.actionType.includes('refund'));
    return { applied, skipped, skippedIds: [] };
  },

  fetchActivity: async (params): Promise<ActivityFeedResponse> => {
    const days = params?.days ?? 30;
    const period = days <= 1 ? 'today' : days <= 7 ? '7d' : '30d';
    const items = filterDemoByPeriod(getActivityDemoItems(), period);
    return { items, source: 'live' };
  },

  fetchSuppliersOverview: async () => {
    const { stats, suppliers } = getSuppliersDemoSnapshot();
    return { stats, suppliers };
  },

  fetchSupplierDetail: async (id) => getSupplierDemoDetail(id),

  patchSupplier: async (id, patch) => {
    const base = getSupplierDemoDetail(id);
    if (!base) throw new Error('Supplier not found');
    return { ...base, ...patch } as SupplierDetail;
  },

  monitorSupplier: async (id) => {
    const supplier = getSupplierDemoDetail(id);
    if (!supplier) throw new Error('Supplier not found');
    return { supplier, productsFound: 12, changes: 2 };
  },

  fetchSupplierChanges: async (): Promise<SupplierChangeRow[]> => {
    const { suppliers } = getSuppliersDemoSnapshot();
    const nordic = suppliers[0];
    if (!nordic) return [];
    return [
      {
        id: 'demo-change-1',
        tenantId: 'mock',
        supplierId: nordic.id,
        changeType: 'price_change',
        payload: { percent: -6.8, skuCount: 4 },
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    ];
  },

  createSupplier: async (body) => ({
    id: `demo_sup_new_${Date.now()}`,
    name: body.name,
    website: body.website,
    supplierType: 'wholesale',
    status: 'active',
    autoSyncEnabled: false,
    productCount: 0,
    lastSyncAt: null,
    lastAutoSyncAt: null,
    recentChangeCount: 0,
    hasRecentPriceDrop: false,
    hasRecentStockChange: false,
    hasRecentImportantChange: false,
    monitoringLabel: 'active',
    recentChanges: [],
    recentProducts: [],
    recentSyncs: [],
  }),

  fetchOutcomeReport: async (days): Promise<OutcomeReport> => {
    const demo = getInsightsDemoSnapshot(days <= 7 ? '7d' : '30d');
    return {
      periodDays: demo.periodDays,
      totalRecords: 4,
      verifiedCount: 3,
      billableCount: 2,
      totalBillableUplift: demo.revenueUpliftAmount,
      records: [],
    };
  },

  fetchAutonomyMetrics: async (): Promise<AutonomyMetricsResponse> => {
    const demo = getInsightsDemoSnapshot('30d');
    return {
      status: 'partial',
      totalDecisions: demo.autonomousActions + demo.highRiskWithApproval,
      autonomousDecisions: demo.autonomousActions,
      humanGatedDecisions: demo.highRiskWithApproval,
      autonomyRate: 0.78,
      targetMet: true,
    };
  },

  fetchBillingSummary: async (days): Promise<BillingSummary> => ({
    periodDays: days,
    totalRecords: 2,
    totalAmount: 248.0,
    reconciledCount: 1,
    records: [
      {
        id: 'bill_demo_1',
        outcomeId: 'out_demo_1',
        amount: 124.0,
        currency: 'EUR',
        status: 'reconciled',
        createdAt: new Date().toISOString(),
      },
    ],
  }),

  reconcileBilling: async () => ({ success: true }),

  executeCommand: async (command) => mockCommandResult(command),

  undoCommand: async (commandId) => ({
    success: true,
    commandId,
    message: 'Mock undo',
    intent: 'mock.intent',
  }),

  executeToolProposal: async (proposalId) => ({
    success: true,
    message: 'Mock tool executed',
    proposalId,
  }),

  rejectToolProposal: async (proposalId) => ({
    success: true,
    message: 'Mock tool rejected',
    proposalId,
  }),

  fetchCommandHistory: async () => [],

  fetchAgentRun: async (commandId) => ({
    commandId,
    agentRunId: null,
    transcript: [],
    status: 'unknown' as const,
    pendingActions: [],
  }),

  fetchNotifications: async () => {
    const seed = getDemoNotificationSeed();
    return seed
      .filter((n) => !mockNotificationDismissed.has(n.id))
      .map((n) => ({
        ...n,
        read: mockNotificationRead.has(n.id) || n.read,
      }));
  },

  markNotificationRead: async (id) => {
    mockNotificationRead.add(id);
  },

  markAllNotificationsRead: async (ids) => {
    const targetIds = ids ?? getDemoNotificationSeed().map((n) => n.id);
    targetIds.forEach((id) => mockNotificationRead.add(id));
  },

  dismissNotification: async (id) => {
    mockNotificationDismissed.add(id);
    mockNotificationRead.add(id);
  },

  fetchOrders: async () => [...mockOrders],

  fetchProducts: async () => getProductsDemoItems(),

  fetchEmails: async () => getEmailsDemoList(),

  fetchEmailDetail: async (id) => getEmailDemoDetail(id),

  fetchNegotiations: async () => getNegotiationsDemoItems(),

  fetchAutonomousDecisions: async () => getAutonomousDemoDecisions(),

  fetchDashboard: async () => buildDashboardDemoSummary(),

  fetchSettings: async () => getSettingsDemo(),

  updateSettings: async (patch) => patchSettingsDemo(patch),

  fetchConnectedServices: async () => getConnectedServicesDemo(),

  fetchOperatingMetrics: async () => getOperatingMetricsDemo(),

  fetchTruthStatus: async () => getTruthStatusDemo(),

  fetchExplainTimeline: async (entityType, entityId) => mockExplainTimeline(entityType, entityId),

  fetchAutonomyTrace: async () => ({
    events: [
      {
        kind: 'decision',
        at: new Date().toISOString(),
        label: 'Mock autonomy trace',
        stage: 'complete',
        module: 'autonomous',
        status: 'ok',
      },
    ],
  }),

  submitTruthReview: async () => ({
    success: true,
    message: 'Mock truth review recorded',
  }),

  fetchSuggestions: async () => ({
    nowRelevant: [],
    groups: [],
    suggestions: [],
  }),

  trackUiEvent: async () => undefined,
};
