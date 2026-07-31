import { mockApprovalsPending, mockActivityFeed } from '../../src/test/fixtures';
import { detectIntent, type DemoIntentId } from '../../src/lib/localIntentMatcher';

/** Map demo intents to backend intent keys that trigger post-command navigation. */
function toRoutableParsedIntent(command: string): string {
  const { id } = detectIntent(command.trim());
  const navigationIntentMap: Partial<Record<DemoIntentId, string>> = {
    HIGH_RISK_APPROVALS: 'APPROVE_CHANGES',
    SUPPLIER_CHECK: 'SUPPLIER_MONITOR',
    INSIGHTS_OVERVIEW: 'FORECAST',
    MARGIN_INSIGHT: 'LOW_MARGIN_REPORT',
    RETURN_RISK_ORDERS: 'ORDER_STATUS',
  };
  return navigationIntentMap[id] ?? id;
}
import type { ActivityItem } from '../../src/types/activity';
import type { ApprovalItem } from '../../src/types/approval';

type PendingApproval = (typeof mockApprovalsPending)[number];

let approvals: PendingApproval[] = mockApprovalsPending.map((a) => ({ ...a }));
let activityItems: ActivityItem[] = mockActivityFeed.items.map((i) => ({
  ...i,
  source: i.source as ActivityItem['source'],
}));
let commandSeq = 0;
let lastCommandId: string | null = null;
let executeShouldFail = false;
let resolveShouldFail = false;
let autonomyMetrics = {
  totalDecisions: 12,
  autonomousDecisions: 8,
  humanGatedDecisions: 4,
  autonomyRate: 0.67,
  targetMet: true,
  status: 'live' as const,
};

const flowSupplier = {
  id: 'sup_flow_1',
  name: 'Flow Test Supply',
  website: 'https://flow-supply.example',
  supplierType: 'wholesale',
  status: 'active' as const,
  autoSyncEnabled: true,
  productCount: 8,
  lastSyncAt: '2026-06-01T10:00:00.000Z',
  lastAutoSyncAt: '2026-06-01T10:00:00.000Z',
  recentChangeCount: 1,
  hasRecentPriceDrop: false,
  hasRecentStockChange: false,
  hasRecentImportantChange: false,
  monitoringLabel: 'sync_on' as const,
};

export function resetPlaywrightApiState(): void {
  approvals = mockApprovalsPending.map((a) => ({ ...a }));
  activityItems = mockActivityFeed.items.map((i) => ({
    ...i,
    source: i.source as ActivityItem['source'],
  }));
  commandSeq = 0;
  lastCommandId = null;
  executeShouldFail = false;
  resolveShouldFail = false;
  autonomyMetrics = {
    totalDecisions: 12,
    autonomousDecisions: 8,
    humanGatedDecisions: 4,
    autonomyRate: 0.67,
    targetMet: true,
    status: 'live' as const,
  };
}

export function setCommandExecuteFails(fail: boolean): void {
  executeShouldFail = fail;
}

export function setApprovalResolveFails(fail: boolean): void {
  resolveShouldFail = fail;
}

export function getPlaywrightApprovals(): PendingApproval[] {
  return approvals;
}

export function getPlaywrightActivityFeed() {
  return { items: activityItems, source: 'live' as const };
}

export function appendPlaywrightActivityItem(item: ActivityItem): void {
  activityItems = [item, ...activityItems].slice(0, 50);
}

export function resolvePlaywrightApproval(id: string): void {
  if (resolveShouldFail) {
    throw new Error('E2E resolve failed');
  }
  const item = approvals.find((a) => a.id === id);
  approvals = approvals.filter((a) => a.id !== id);
  if (item) {
    appendPlaywrightActivityItem({
      id: `e2e-activity-approval-${id}`,
      source: 'audit',
      at: new Date().toISOString(),
      actionType: 'approval_approved',
      actionLabel: 'Goedgekeurd',
      description: `${item.actionType} — ${item.module}`,
      module: item.module,
      category: 'approval',
      risk: item.actionType === 'refund' ? 'high' : 'low',
      status: 'approved',
      executor: 'merchant',
      related: { type: 'approval', id },
      searchText: `${item.module} ${item.actionType}`.toLowerCase(),
    });
  }
}

export function executePlaywrightCommand(command: string) {
  if (executeShouldFail) {
    throw new Error('E2E command failed');
  }
  const trimmed = command.trim();
  // Compound commands resolve via mergeApiWithDemoUi / buildDemoResponse on success.
  commandSeq += 1;
  lastCommandId = `e2e-cmd-${commandSeq}`;
  const now = new Date().toISOString();
  const undoExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const result = {
    success: true,
    originalCommand: trimmed,
    result: `E2E uitgevoerd: ${trimmed}`,
    parsedIntent: toRoutableParsedIntent(trimmed),
    action: 'e2e_action',
    confidence: 0.91,
    timestamp: now,
    commandId: lastCommandId,
    undoable: true,
    undoExpiresAt,
  };
  autonomyMetrics = {
    ...autonomyMetrics,
    totalDecisions: autonomyMetrics.totalDecisions + 1,
    autonomousDecisions: autonomyMetrics.autonomousDecisions + 1,
  };
  appendPlaywrightActivityItem({
    id: `e2e-activity-command-${lastCommandId}`,
    source: 'command',
    at: now,
    actionType: 'command_executed',
    actionLabel: 'NL-commando',
    description: result.result,
    module: 'admin-command-bar',
    category: 'command',
    risk: 'none',
    status: 'info',
    executor: 'merchant',
    searchText: command.trim().toLowerCase(),
  });
  return result;
}

export function getPlaywrightSupplierOverview() {
  return {
    stats: {
      totalMonitored: 1,
      activeAutoSyncs: 1,
      syncsCompletedThisMonth: 1,
      priceDropsThisMonth: 0,
      autonomousPriceAdjustments: 0,
    },
    suppliers: [flowSupplier],
  };
}

export function getPlaywrightSupplierDetail(id: string) {
  return {
    id,
    name: flowSupplier.name,
    website: flowSupplier.website,
    supplierType: flowSupplier.supplierType,
    status: flowSupplier.status,
    autoSyncEnabled: flowSupplier.autoSyncEnabled,
    productCount: flowSupplier.productCount,
    lastSyncAt: flowSupplier.lastSyncAt,
    lastAutoSyncAt: flowSupplier.lastAutoSyncAt,
    recentChanges: [],
    recentProducts: [],
    syncHistory: [],
  };
}

export function monitorPlaywrightSupplier(id: string) {
  const now = new Date().toISOString();
  if (flowSupplier.id === id) {
    flowSupplier.lastSyncAt = now;
    flowSupplier.lastAutoSyncAt = now;
    flowSupplier.recentChangeCount += 1;
    flowSupplier.hasRecentImportantChange = true;
  }
  appendPlaywrightActivityItem({
    id: `e2e-activity-supplier-sync-${id}`,
    source: 'audit',
    at: now,
    actionType: 'supplier_sync',
    actionLabel: 'Leverancier gesynchroniseerd',
    description: 'Flow Test Supply — sync voltooid',
    module: 'supplier-intelligence',
    category: 'supplier',
    risk: 'low',
    status: 'autonomous',
    executor: 'system',
    related: { type: 'supplier', id },
    searchText: 'flow test supply sync',
  });
  return {
    supplier: { id, name: flowSupplier.name },
    changes: 1,
  };
}

export function getPlaywrightAutonomyMetrics() {
  return { ...autonomyMetrics };
}

const playwrightAgentsRoster = {
  agents: [
    {
      agentKey: 'inventory',
      displayName: 'Inventory',
      description: 'Voorraad en sync agent',
      supportedIntents: [],
      canDelegateTo: [],
      status: 'active' as const,
      proactiveCount: 1,
      recentActionCount: 3,
    },
    {
      agentKey: 'pricing',
      displayName: 'Pricing',
      description: 'Prijsoptimalisatie agent',
      supportedIntents: [],
      canDelegateTo: [],
      status: 'idle' as const,
      proactiveCount: 0,
      recentActionCount: 2,
    },
  ],
};

const playwrightAgentActivity: Record<string, import('../../src/types/agents').AgentActivityResponse> = {
  inventory: {
    agentKey: 'inventory',
    activity: [
      {
        id: 'e2e-agent-act-1',
        source: 'audit',
        at: '2026-06-04T09:00:00.000Z',
        actionType: 'autonomy_execute',
        actionLabel: 'Autonome sync',
        description: 'Voorraad gesynchroniseerd (42 SKU)',
        module: 'inventory-pricing',
        risk: 'low',
        status: 'autonomous',
        executor: 'aether',
        agentKeys: ['inventory'],
        details: {
          explainabilitySourceType: 'command',
          explainabilitySourceId: 'e2e-explain-1',
        },
      },
      {
        id: 'e2e-agent-act-3',
        source: 'audit',
        at: '2026-06-04T08:30:00.000Z',
        actionType: 'stock_alert',
        actionLabel: 'Voorraadmelding',
        description: 'Lage voorraad op 3 SKU',
        module: 'inventory-pricing',
        risk: 'low',
        status: 'info',
        executor: 'aether',
        agentKeys: ['inventory'],
      },
    ],
    proactiveSuggestions: [
      {
        id: 'e2e-proactive-inventory',
        title: 'Voorraad aanvullen voor top SKU',
        summary: '3 SKU onder drempel',
        command: 'Check voorraad',
        triggerId: 'stock-low',
        status: 'open',
        createdAt: '2026-06-04T08:00:00.000Z',
      },
    ],
    explainability: [],
  },
  pricing: {
    agentKey: 'pricing',
    activity: [
      {
        id: 'e2e-agent-act-2',
        source: 'audit',
        at: '2026-06-04T09:15:00.000Z',
        actionType: 'price_adjust',
        actionLabel: 'Prijsaanpassing',
        description: '12 SKU prijs geoptimaliseerd',
        module: 'inventory-pricing',
        risk: 'low',
        status: 'autonomous',
        executor: 'aether',
        agentKeys: ['pricing'],
      },
    ],
    proactiveSuggestions: [],
    explainability: [],
  },
};

const playwrightProactiveSuggestions = {
  suggestions: [
    {
      id: 'e2e-proactive-1',
      label: '3 low-risk prijsaanpassingen kunnen automatisch worden uitgevoerd',
      command: 'Voer low-risk prijsaanpassingen automatisch uit',
      intentId: 'AUTONOMOUS_ACTION',
      category: 'prijs',
      hint: '+€870 marge',
      executionMode: 'autonomous',
      source: 'brain',
      priority: 1,
      hasExplainability: true,
    },
    {
      id: 'e2e-proactive-2',
      label: 'Bulkprijs voor 23 SKU wacht op goedkeuring',
      command: 'Toon high-risk goedkeuringen',
      intentId: 'HIGH_RISK_APPROVALS',
      category: 'prijs',
      hint: 'Hoog risico',
      executionMode: 'approval_required',
      source: 'brain',
      priority: 2,
      hasExplainability: true,
    },
  ],
};

const playwrightNotificationGroupMembers: Record<string, import('../../src/types/notification').AppNotification[]> = {
  'approval-batch-demo': [
    {
      id: 'e2e-group-child-1',
      title: 'Terugbetaling € 89,50',
      body: 'High-risk refund — wacht op goedkeuring',
      severity: 'action',
      read: false,
      createdAt: '2026-06-04T09:35:00.000Z',
      href: '/approvals',
      source: 'system',
      category: 'high_risk_approval',
      kind: 'approval_needed',
      groupKey: 'approval-batch-demo',
    },
    {
      id: 'e2e-group-child-2',
      title: 'Prijsbulk wijziging',
      body: '23 SKU — high-risk batch',
      severity: 'action',
      read: false,
      createdAt: '2026-06-04T09:32:00.000Z',
      href: '/approvals',
      source: 'system',
      category: 'high_risk_approval',
      kind: 'approval_needed',
      groupKey: 'approval-batch-demo',
    },
  ],
};

export function getPlaywrightAgentsRoster() {
  return playwrightAgentsRoster;
}

export function getPlaywrightAgentActivity(agentKey: string) {
  return playwrightAgentActivity[agentKey] ?? {
    agentKey,
    activity: [],
    proactiveSuggestions: [],
    explainability: [],
  };
}

export function getPlaywrightProactiveSuggestions() {
  return playwrightProactiveSuggestions;
}

export function getPlaywrightNotificationGroup(groupKey: string) {
  return {
    notifications: playwrightNotificationGroupMembers[groupKey] ?? [],
    hasMore: false,
  };
}

export function getPlaywrightNotificationsInbox() {
  return {
    notifications: [
      {
        id: 'e2e-notif-unread',
        title: 'Prijsdaling gedetecteerd',
        body: 'Nordic Supply Co. — 4 SKU met −6,8% inkoopprijs',
        severity: 'action' as const,
        read: false,
        createdAt: '2026-06-04T09:52:00.000Z',
        href: '/suppliers',
        source: 'system' as const,
        category: 'supplier_change' as const,
      },
      {
        id: 'e2e-notif-grouped',
        title: 'Goedkeuring vereist',
        body: 'Terugbetaling € 89,50 — high-risk, wacht op jou',
        severity: 'action' as const,
        read: false,
        createdAt: '2026-06-04T09:35:00.000Z',
        href: '/approvals',
        actionLabel: 'Open goedkeuringen',
        source: 'system' as const,
        category: 'high_risk_approval' as const,
        kind: 'approval_needed' as const,
        groupKey: 'approval-batch-demo',
        groupCount: 3,
      },
    ],
    hasMore: false,
  };
}

export function getPlaywrightExplainTimeline() {
  return {
    entityType: 'command',
    entityId: 'e2e-explain-1',
    detailLevel: 'simple',
    summary: 'E2E explain summary',
    summarySource: 'template',
    events: [],
  };
}

export function undoPlaywrightCommand(commandId: string) {
  return {
    success: true,
    commandId,
    message: 'E2E undo',
    intent: 'test.intent',
  };
}

export type { ApprovalItem };
