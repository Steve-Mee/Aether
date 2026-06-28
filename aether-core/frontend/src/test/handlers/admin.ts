import { http, HttpResponse } from 'msw';
import {
  mockDashboard,
  mockMerchantSettings,
  mockConnectedServices,
  mockSupplierOverview,
  mockTruthStatus,
} from '../fixtures';
import { DEFAULT_OVERVIEW_PREFS } from '@/lib/settings/merchantSettingsTypes';
import { getMswLastCommand, getMswActivityFeed, getMswApprovals, mswExecuteCommand, mswUndoCommand } from './state';

const mswNotificationRead = new Set<string>();
const mswNotificationDismissed = new Set<string>();

export const adminHandlers = [
  http.post('*/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    return HttpResponse.json({
      accessToken: 'msw-jwt-token',
      expiresIn: 900,
      tenantId: 'tenant_default',
      merchantName: 'Demo Merchant',
      user: {
        id: 'u_msw',
        name: 'MSW User',
        email: body.email ?? 'admin@aether.local',
        role: 'admin',
      },
    });
  }),
  http.post('*/api/auth/refresh', () =>
    HttpResponse.json({
      accessToken: 'msw-jwt-token-refreshed',
      expiresIn: 900,
      tenantId: 'tenant_default',
      merchantName: 'Demo Merchant',
      user: {
        id: 'u_msw',
        name: 'MSW User',
        email: 'admin@aether.local',
        role: 'admin',
      },
    }),
  ),
  http.get('*/api/auth/session', () =>
    HttpResponse.json({
      tenantId: 'tenant_default',
      merchantName: 'Demo Merchant',
      user: {
        id: 'u_msw',
        name: 'MSW User',
        email: 'admin@aether.local',
        role: 'admin',
      },
    }),
  ),
  http.post('*/api/auth/logout', () => new HttpResponse(null, { status: 204 })),
  http.get('*/api/admin/dashboard', () => HttpResponse.json(mockDashboard)),
  http.get('*/api/admin/events/stream', () => new HttpResponse(null, { status: 204 })),
  http.get('*/api/admin/activity', () => HttpResponse.json(getMswActivityFeed())),
  http.get('*/api/admin/overview/handoffs', () =>
    HttpResponse.json({
      items: [
        {
          id: 'handoff-demo-1',
          at: new Date().toISOString(),
          fromAgentKey: 'inventory',
          toAgentKey: 'pricing',
          mode: 'sync',
          status: 'completed',
          summary: 'Margin check',
        },
      ],
    }),
  ),
  http.get('*/api/admin/overview', () => {
    const feed = getMswActivityFeed();
    const approvals = getMswApprovals().filter((a) => a.status === 'pending');
    return HttpResponse.json({
      items: feed.items.map((item) => ({
        kind: 'activity',
        at: item.at,
        id: item.id,
        cursor: `msw-${item.id}`,
        payload: item,
      })),
      nextCursor: null,
      hasMore: false,
      meta: {
        pendingApprovals: approvals.length,
        proactiveCount: 1,
        activeGoals: 0,
      },
    });
  }),
  http.get('*/api/admin/agents', () =>
    HttpResponse.json({
      agents: [
        {
          agentKey: 'inventory',
          displayName: 'Inventory',
          description: 'Stock agent',
          supportedIntents: [],
          canDelegateTo: [],
          status: 'idle',
          proactiveCount: 0,
          recentActionCount: 2,
        },
        {
          agentKey: 'pricing',
          displayName: 'Pricing',
          description: 'Pricing agent',
          supportedIntents: [],
          canDelegateTo: [],
          status: 'idle',
          proactiveCount: 0,
          recentActionCount: 1,
        },
      ],
    }),
  ),
  http.get('*/api/admin/agents/metrics', () =>
    HttpResponse.json({
      agents: [
        {
          agentKey: 'inventory',
          successRate: 0.92,
          recentFailures: 0,
          sampleSize: 14,
          displayName: 'Inventory',
        },
        {
          agentKey: 'pricing',
          successRate: 0.81,
          recentFailures: 1,
          sampleSize: 11,
          displayName: 'Pricing',
        },
      ],
    }),
  ),
  http.get('*/api/admin/notifications', () =>
    HttpResponse.json({
      notifications: [
        {
          id: 'notif-msw-1',
          title: 'MSW notification',
          body: 'Test body',
          severity: 'info',
          read: mswNotificationRead.has('notif-msw-1'),
          createdAt: '2026-06-01T10:00:00.000Z',
          source: 'system',
        },
      ].filter((n) => !mswNotificationDismissed.has(n.id)),
    }),
  ),
  http.patch('*/api/admin/notifications/:id/read', ({ params }) => {
    mswNotificationRead.add(String(params.id));
    return new HttpResponse(null, { status: 204 });
  }),
  http.post('*/api/admin/notifications/mark-all-read', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { ids?: string[] };
    const ids = body.ids ?? ['notif-msw-1'];
    ids.forEach((id) => mswNotificationRead.add(id));
    return new HttpResponse(null, { status: 204 });
  }),
  http.delete('*/api/admin/notifications/:id', ({ params }) => {
    mswNotificationDismissed.add(String(params.id));
    mswNotificationRead.add(String(params.id));
    return new HttpResponse(null, { status: 204 });
  }),
  http.get('*/api/suppliers/overview', () => HttpResponse.json(mockSupplierOverview)),
  http.get('*/api/admin/truth-status', () => HttpResponse.json(mockTruthStatus)),
  http.get('*/api/admin/settings', () =>
    HttpResponse.json({
      ...mockMerchantSettings,
      settings: {
        ...mockMerchantSettings.settings,
        overviewPrefs: DEFAULT_OVERVIEW_PREFS,
        proactivePrefs: {
          enabled: true,
          visibility: 'all',
          maxActive: 5,
          allowAutoExecute: false,
          snoozeDefaultHours: 24,
          categories: { prijs: true, leverancier: true, voorraad: true, algemeen: true },
        },
        goalPrefs: {
          enabled: true,
          maxActive: 5,
          defaultPursuitMode: 'balanced',
          allowGoalLinkedAutoExecute: false,
          showOnCommandCenter: true,
          conflictResolution: 'manual',
          allowFederatedContribution: false,
          showGlobalHints: false,
        },
      },
    }),
  ),
  http.put('*/api/admin/settings', async ({ request }) => {
    const patch = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      settings: { ...mockMerchantSettings.settings, ...patch },
    });
  }),
  http.get('*/api/admin/operating-metrics', () =>
    HttpResponse.json({ status: 'live', metrics: {} }),
  ),
  http.get('*/api/admin/explain', () => HttpResponse.json({ events: [] })),
  http.post('*/api/admin/truth-review', () => HttpResponse.json({ success: true })),
  http.get('*/api/admin/autonomy/trace', () => HttpResponse.json({ traces: [] })),
  http.post('*/api/admin/autonomy/simulate', async ({ request }) => {
    const body = (await request.json()) as {
      module?: string;
      actionType?: string;
      payload?: Record<string, unknown>;
    };
    const margin = Number(body.payload?.marginImpact ?? 0);
    const mode =
      margin > (mockMerchantSettings.settings.maxMarginImpactEuro ?? 500)
        ? 'approval_required'
        : 'autonomous';
    return HttpResponse.json({
      assessment: {
        executionMode: mode,
        eligible: mode === 'autonomous',
        reason: mode === 'autonomous' ? 'Simulated allow' : 'Simulated margin exceeded',
        reasonCode: mode === 'autonomous' ? 'low_risk_allowed' : 'margin_exceeded',
        riskClass: 'low',
        category: 'pricing',
      },
      trace: [
        { step: 'high_risk_guard', passed: true },
        { step: 'policy_enabled', passed: true },
        { step: 'custom_rule', passed: true, reason: 'Geen regel van toepassing' },
      ],
      settingsSnapshot: {
        preset: mockMerchantSettings.settings.autonomyPrefs?.preset ?? 'balanced',
        autonomyLevel: mockMerchantSettings.settings.autonomyLevel,
        policyEnabled: mockMerchantSettings.settings.policyEnabled,
      },
    });
  }),
  http.get('*/api/admin/connected-services', () => HttpResponse.json(mockConnectedServices)),
  http.get('*/api/admin/commands', () => HttpResponse.json({ commands: [] })),
  http.get('*/api/admin/suggestions', () =>
    HttpResponse.json({ nowRelevant: [], groups: [], suggestions: [] }),
  ),
  http.post('*/api/admin/ui-event', () => HttpResponse.json({ success: true })),
  http.post('*/api/admin/command', async ({ request }) => {
    try {
      const body = (await request.json()) as { command?: string };
      const command = body.command ?? '';
      const result = mswExecuteCommand(command);
      return HttpResponse.json(result);
    } catch (e) {
      return HttpResponse.json(
        { error: e instanceof Error ? e.message : 'Command failed' },
        { status: 500 },
      );
    }
  }),
  http.post('*/api/admin/command/:id/undo', ({ params }) => {
    const commandId = String(params.id);
    return HttpResponse.json(mswUndoCommand(commandId));
  }),
];

export function getLastMswCommandResult() {
  return getMswLastCommand();
}
