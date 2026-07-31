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
  activity: (params?: { days?: number; since?: string; limit?: number; agentKey?: string }) =>
    ['activity', params ?? {}] as const,
  agents: () => ['agents', 'roster'] as const,
  agentActivity: (agentKey: string, days?: number) =>
    ['agents', agentKey, 'activity', days ?? 7] as const,
  truthStatus: () => ['truth-status'] as const,
  emails: {
    all: () => ['emails'] as const,
    detail: (id: string) => ['emails', id] as const,
  },
  products: () => ['products'] as const,
  product: (id: string) => ['products', id] as const,
  website: {
    all: () => ['website'] as const,
    projects: () => ['website', 'projects'] as const,
    project: (projectId: string) => ['website', 'project', projectId] as const,
    revisions: (projectId: string) => ['website', 'revisions', projectId] as const,
    revision: (revisionId: string) => ['website', 'revision', revisionId] as const,
    pages: (revisionId: string) => ['website', 'pages', revisionId] as const,
    preview: (revisionId: string) => ['website', 'preview', revisionId] as const,
  },
  orders: () => ['orders'] as const,
  order: (id: string) => ['orders', id] as const,
  customers: () => ['customers'] as const,
  customer: (id: string) => ['customers', id] as const,
  customerOrders: (id: string) => ['customers', id, 'orders'] as const,
  inventory: () => ['inventory'] as const,
  promotions: () => ['promotions'] as const,
  paymentsSummary: () => ['payments', 'summary'] as const,
  paymentsList: () => ['payments', 'list'] as const,
  paymentsPayouts: () => ['payments', 'payouts'] as const,
  autonomous: () => ['autonomous'] as const,
  negotiations: () => ['negotiations'] as const,
  billing: (days?: number) => ['billing', days ?? 30] as const,
  autonomyMetrics: (days?: number) => ['autonomy-metrics', days ?? 30] as const,
  connectedServices: () => ['connected-services'] as const,
  operatingMetrics: () => ['operating-metrics'] as const,
  workstream: () => ['workstream'] as const,
  outcomes: (days?: number) => ['outcomes', days ?? 30] as const,
  suggestions: (pathname: string) => ['suggestions', pathname] as const,
  proactiveSuggestions: () => ['proactive-suggestions'] as const,
  goals: (includeCompleted?: boolean) => ['goals', includeCompleted ?? false] as const,
  goal: (id: string) => ['goals', id] as const,
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
  aetherOverview: (params?: {
    days?: number;
    limit?: number;
    agentKey?: string;
    risk?: string;
    module?: string;
    executionMode?: string;
    actionType?: string;
    search?: string;
    cursor?: string;
  }) => ['aether-overview', params ?? {}] as const,
  aetherOverviewInfinite: (params?: Record<string, unknown>) =>
    ['aether-overview', 'infinite', params ?? {}] as const,
  aetherOverviewHandoffs: (days?: number) => ['aether-overview', 'handoffs', days ?? 7] as const,
  agentMetrics: (days?: number) => ['agents', 'metrics', days ?? 30] as const,
} as const;
