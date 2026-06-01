export const mockDashboard = {
  status: 'live',
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
  commands7d: 11,
  manualNavEvents7d: 9,
  timestamp: new Date().toISOString(),
};

export const mockPolicy = {
  status: 'live',
  policy: {
    autoApproveLowRisk: true,
    autoApproveMediumRiskMail: false,
    maxAutoPriceChangePct: 5,
    enabled: true,
  },
};
