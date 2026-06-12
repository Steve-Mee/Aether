/** Central query key factory — use for all TanStack Query cache keys. */
export const queryKeys = {
  dashboard: () => ['dashboard'] as const,
  settings: () => ['settings'] as const,
  approvals: {
    all: () => ['approvals'] as const,
    list: () => ['approvals', 'list'] as const,
  },
  suppliers: {
    all: () => ['suppliers'] as const,
    overview: () => ['suppliers', 'overview'] as const,
    detail: (id: string) => ['suppliers', 'detail', id] as const,
    changes: (status?: string) => ['suppliers', 'changes', status ?? 'pending'] as const,
  },
  activity: (params?: { days?: number; since?: string; limit?: number }) =>
    ['activity', params ?? {}] as const,
  truthStatus: () => ['truth-status'] as const,
  emails: {
    all: () => ['emails'] as const,
    detail: (id: string) => ['emails', id] as const,
  },
  products: () => ['products'] as const,
  orders: () => ['orders'] as const,
  autonomous: () => ['autonomous'] as const,
  negotiations: () => ['negotiations'] as const,
  billing: (days?: number) => ['billing', days ?? 30] as const,
  autonomyMetrics: (days?: number) => ['autonomy-metrics', days ?? 30] as const,
  connectedServices: () => ['connected-services'] as const,
  operatingMetrics: () => ['operating-metrics'] as const,
  workstream: () => ['workstream'] as const,
  outcomes: (days?: number) => ['outcomes', days ?? 30] as const,
  suggestions: (pathname: string) => ['suggestions', pathname] as const,
  commands: {
    history: () => ['commands', 'history'] as const,
  },
  notifications: {
    inbox: () => ['notifications', 'inbox'] as const,
  },
  insights: {
    combined: (days: number) => ['insights', 'combined', days] as const,
  },
  explain: (entityType: string, entityId: string) => ['explain', entityType, entityId] as const,
  autonomyTrace: (limit?: number) => ['autonomy-trace', limit ?? 30] as const,
} as const;
