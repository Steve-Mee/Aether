/** Central REST path registry — single source for httpAdapter routes. */

function activityQuery(params?: {
  days?: number;
  since?: string;
  limit?: number;
  module?: string;
}): string {
  const q = new URLSearchParams();
  if (params?.days != null) q.set('days', String(params.days));
  if (params?.since) q.set('since', params.since);
  if (params?.limit != null) q.set('limit', String(params.limit));
  if (params?.module) q.set('module', params.module);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const apiRoutes = {
  auth: {
    login: '/api/auth/login',
    refresh: '/api/auth/refresh',
    session: '/api/auth/session',
    logout: '/api/auth/logout',
  },
  approvals: {
    list: '/api/approvals',
    resolve: (id: string) => `/api/approvals/${id}/resolve`,
    autoApply: '/api/approvals/auto-apply',
  },
  admin: {
    activity: (params?: Parameters<typeof activityQuery>[0]) =>
      `/api/admin/activity${activityQuery(params)}`,
    command: '/api/admin/command',
    commandUndo: (id: string) => `/api/admin/command/${id}/undo`,
    commands: '/api/admin/commands',
    dashboard: '/api/admin/dashboard',
    settings: '/api/admin/settings',
    connectedServices: '/api/admin/connected-services',
    operatingMetrics: '/api/admin/operating-metrics',
    truthStatus: '/api/admin/truth-status',
    truthReview: '/api/admin/truth-review',
    explain: (entityType: string, entityId: string) =>
      `/api/admin/explain?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`,
    autonomy: (days: number) => `/api/admin/autonomy?days=${days}`,
    autonomyTrace: (limit: number) => `/api/admin/autonomy/trace?limit=${limit}`,
    suggestions: (route: string, limit: number) => {
      const qs = new URLSearchParams({ route, limit: String(limit) });
      return `/api/admin/suggestions?${qs}`;
    },
    uiEvent: '/api/admin/ui-event',
    eventsStream: '/api/admin/events/stream',
    notifications: (limit = 30) => `/api/admin/notifications?limit=${limit}`,
    notificationRead: (id: string) => `/api/admin/notifications/${encodeURIComponent(id)}/read`,
    notificationsMarkAllRead: '/api/admin/notifications/mark-all-read',
    notificationDismiss: (id: string) => `/api/admin/notifications/${encodeURIComponent(id)}`,
  },
  suppliers: {
    overview: '/api/suppliers/overview',
    detail: (id: string) => `/api/suppliers/${id}`,
    patch: (id: string) => `/api/suppliers/${id}`,
    monitor: (id: string) => `/api/suppliers/${id}/monitor`,
    create: '/api/suppliers',
    changes: (status = 'pending') => `/api/suppliers/changes?status=${encodeURIComponent(status)}`,
  },
  outcomes: {
    report: (days: number) => `/api/outcomes/report?days=${days}`,
    billing: (days: number) => `/api/outcomes/billing?days=${days}`,
    billingReconcile: '/api/outcomes/billing/reconcile',
  },
  orders: { list: '/api/orders' },
  products: { list: '/api/products' },
  emails: {
    list: '/api/emails',
    detail: (id: string) => `/api/emails/${id}`,
  },
  agentic: {
    negotiations: '/api/agentic/negotiations',
  },
  autonomous: { list: '/api/autonomous' },
} as const;
