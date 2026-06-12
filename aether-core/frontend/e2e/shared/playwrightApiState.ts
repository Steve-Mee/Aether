import { mockApprovalsPending, mockActivityFeed } from '../../src/test/fixtures';
import { detectIntent, type DemoIntentId } from '../../src/lib/localIntentMatcher';
import { isCompoundCommand } from '../../src/lib/compoundCommandParser';

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
      at: '2026-06-04T10:05:00.000Z',
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
  if (isCompoundCommand(trimmed)) {
    throw new Error('E2E compound demo fallback');
  }
  commandSeq += 1;
  lastCommandId = `e2e-cmd-${commandSeq}`;
  const result = {
    success: true,
    originalCommand: trimmed,
    result: `E2E uitgevoerd: ${trimmed}`,
    parsedIntent: toRoutableParsedIntent(trimmed),
    action: 'e2e_action',
    confidence: 0.91,
    timestamp: '2026-06-04T10:00:00.000Z',
    commandId: lastCommandId,
    undoable: true,
    undoExpiresAt: '2026-06-04T12:00:00.000Z',
  };
  autonomyMetrics = {
    ...autonomyMetrics,
    totalDecisions: autonomyMetrics.totalDecisions + 1,
    autonomousDecisions: autonomyMetrics.autonomousDecisions + 1,
  };
  appendPlaywrightActivityItem({
    id: `e2e-activity-command-${lastCommandId}`,
    source: 'command',
    at: '2026-06-04T10:00:00.000Z',
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
  const now = '2026-06-04T11:00:00.000Z';
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

export function undoPlaywrightCommand(commandId: string) {
  return {
    success: true,
    commandId,
    message: 'E2E undo',
    intent: 'test.intent',
  };
}

export type { ApprovalItem };
