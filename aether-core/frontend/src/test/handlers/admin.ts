import { http, HttpResponse } from 'msw';
import {
  mockDashboard,
  mockMerchantSettings,
  mockPolicy,
  mockConnectedServices,
  mockSupplierOverview,
  mockTruthStatus,
} from '../fixtures';
import { getMswLastCommand, getMswActivityFeed, mswExecuteCommand, mswUndoCommand } from './state';

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
  http.get('*/api/admin/settings', () => HttpResponse.json(mockMerchantSettings)),
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
  http.get('*/api/admin/policies/approval', () => HttpResponse.json(mockPolicy)),
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
