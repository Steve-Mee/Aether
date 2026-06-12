/** Canonical API fixtures for Vitest (MSW), Playwright routes, and test adapters. */

export const FIXTURE_TIMESTAMP = '2026-06-04T10:00:00.000Z';
export const FIXTURE_TIMESTAMP_OLD = '2026-06-03T08:00:00.000Z';

export const mockDashboard = {
  status: 'live',
  tenantDisplayName: 'Demo Merchant',
  productCount: 12,
  lowMarginProducts: 2,
  unreadEmails: 3,
  pendingApprovals: 1,
  recentCommands: 8,
  revenueUplift30d: 1200,
  emailMetrics: {
    classificationRate: 0.72,
    escalationRate: 0.1,
    targetsMet: { classificationAbove60Pct: true, escalationBelow15Pct: true },
  },
  autonomyRate: 0.65,
  autonomyTargetMet: false,
  timeSavedMinutes7d: 24,
  nlActionShare7d: 0.55,
  autonomousActions7d: 6,
  lowRiskAutonomous24h: 3,
  commands7d: 11,
  manualNavEvents7d: 9,
  timestamp: FIXTURE_TIMESTAMP,
};

export const mockApprovalsPending = [
  {
    id: 'approval-refund-1',
    module: 'payment-fulfillment',
    actionType: 'refund',
    payload: { paymentId: 'pay-1', amount: 49.99 },
    status: 'pending',
    createdAt: FIXTURE_TIMESTAMP,
  },
  {
    id: 'approval-mail-1',
    module: 'aether-mail',
    actionType: 'auto_reply',
    payload: {
      emailId: 'email-1',
      from: 'klant@example.com',
      subject: 'Levering vertraagd',
      category: 'escalatie',
    },
    status: 'pending',
    createdAt: FIXTURE_TIMESTAMP_OLD,
  },
];

export const mockPolicy = {
  status: 'live',
  policy: {
    autoApproveLowRisk: true,
    autoApproveMediumRiskMail: false,
    maxAutoPriceChangePct: 5,
    enabled: true,
  },
};

export const mockMerchantSettings = {
  status: 'live',
  settings: {
    autonomyLevel: 'medium',
    autoApproveLowRisk: true,
    autoApproveMediumRiskMail: false,
    maxAutoPriceChangePct: 5,
    maxMarginImpactEuro: 500,
    policyEnabled: true,
    autoRunWindow: 'always',
    autoRunWindowStart: '18:00',
    autoRunWindowEnd: '08:00',
    notificationPrefs: {
      autonomousLowRisk: { inApp: true, email: false },
      highRiskApproval: { inApp: true, email: true },
      supplierChanges: { inApp: true, email: false },
      weeklyDigest: { inApp: true, email: true },
      frequency: 'immediate',
    },
    locale: 'nl',
    dataExportEnabled: true,
  },
};

export const mockActivityFeed = {
  items: [
    {
      id: 'audit-e2e-1',
      source: 'audit',
      at: FIXTURE_TIMESTAMP_OLD,
      actionType: 'autonomy_execute',
      actionLabel: 'Autonome sync',
      description: 'Voorraad en prijzen gesynchroniseerd (142 SKU)',
      module: 'inventory-pricing',
      risk: 'low',
      status: 'autonomous',
      executor: 'aether',
    },
    {
      id: 'command-e2e-1',
      source: 'command',
      at: FIXTURE_TIMESTAMP,
      actionType: 'command_executed',
      actionLabel: 'NL-commando',
      description: 'Check leveranciers op prijsdalingen',
      module: 'admin-command-bar',
      risk: 'none',
      status: 'info',
      executor: 'merchant',
    },
  ],
  source: 'live' as const,
};

export const mockSupplierOverview = {
  stats: {
    totalMonitored: 4,
    activeAutoSyncs: 3,
    syncsCompletedThisMonth: 2,
    priceDropsThisMonth: 2,
    autonomousPriceAdjustments: 1,
  },
  suppliers: [],
};

export const mockConnectedServices = {
  status: 'live',
  services: [
    {
      id: 'mail-demo',
      name: 'AETHER Mail',
      type: 'email',
      status: 'demo',
      lastSyncAt: null,
      detail: 'Nog geen mailbox gekoppeld',
    },
  ],
};

export const mockTruthStatus = {
  version: '1',
  updatedAt: FIXTURE_TIMESTAMP,
  claimPolicy: 'test',
  features: {},
  phases: {},
};
