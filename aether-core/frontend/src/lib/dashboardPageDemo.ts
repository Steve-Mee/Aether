import type { DashboardSummary } from '@/lib/api';
import { getApprovalsDemoItems } from '@/lib/approvalsPageDemo';
import { getEmailsDemoList } from '@/lib/emailsPageDemo';
import { getProductsDemoItems } from '@/lib/productsPageDemo';

export function buildDashboardDemoSummary(): DashboardSummary {
  const approvals = getApprovalsDemoItems();
  const emails = getEmailsDemoList();
  const products = getProductsDemoItems();
  const lowMargin = products.filter((p) => p.price > 0 && p.stock < 10).length;

  return {
    status: 'partial',
    productCount: products.length,
    lowMarginProducts: lowMargin,
    unreadEmails: emails.filter((e) => e.status !== 'archived').length,
    pendingApprovals: approvals.length,
    recentCommands: 3,
    revenueUplift30d: 12400,
    emailMetrics: {
      classificationRate: 0.87,
      escalationRate: 0.11,
      targetsMet: { classificationAbove60Pct: true, escalationBelow15Pct: true },
    },
    autonomyRate: 0.78,
    autonomyTargetMet: true,
    timeSavedMinutes7d: 340,
    nlActionShare7d: 0.62,
    autonomousActions7d: 18,
    lowRiskAutonomous24h: 4,
    commands7d: 12,
    manualNavEvents7d: 28,
    timestamp: new Date().toISOString(),
  };
}
