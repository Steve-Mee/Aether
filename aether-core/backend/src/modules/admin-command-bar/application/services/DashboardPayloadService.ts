import { getAutonomyMetrics } from '../../../../shared/autonomy/AutonomyMetricsService';
import { getEmailMetrics } from '../../../aether-mail/application/services/EmailMetricsService';
import type { EmailAnalyticsPort } from '../../../aether-mail/application/ports/EmailAnalyticsPort';
import { countPendingApprovals } from '../../../../shared/approval/approvalService';
import { computeIncrementalRevenueUplift } from '../../../../ai/attribution/OutcomeEngine';
import {
  getDashboardAggregateStatus,
} from '../../../../shared/truth/featureStatusRegistry';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';

export async function buildDashboardPayload(
  tenantId: string,
  emailAnalytics: EmailAnalyticsPort
) {
  const { adminData, proactiveSuggestionService, uiAdoptionMetricsService } = getCompositionRoot();
  const [
    products,
    lowMarginProducts,
    unreadEmails,
    pendingApprovals,
    recentCommands,
    uplift,
    emailMetrics,
    autonomy,
    uiMetrics,
    tenantDisplayName,
    proactiveCount,
  ] = await Promise.all([
    adminData.countProducts(tenantId),
    adminData.countLowMarginProducts(tenantId),
    adminData.countEmailsByStatus(tenantId, ['received', 'escalated']),
    countPendingApprovals(tenantId),
    adminData.countRecentCommands(tenantId),
    computeIncrementalRevenueUplift(tenantId, 30),
    getEmailMetrics(tenantId, 30, emailAnalytics),
    getAutonomyMetrics(tenantId, 30),
    uiAdoptionMetricsService.compute(tenantId),
    adminData.getTenantDisplayName(tenantId),
    proactiveSuggestionService.countActive(tenantId),
  ]);

  return {
    status: getDashboardAggregateStatus(),
    tenantDisplayName,
    productCount: products,
    lowMarginProducts,
    unreadEmails,
    pendingApprovals,
    recentCommands,
    revenueUplift30d: uplift,
    upliftNote: 'Verified and billable outcomes only',
    emailMetrics,
    autonomyRate: autonomy.autonomyRate,
    autonomyTargetMet: autonomy.targetMet,
    timeSavedMinutes7d: uiMetrics.timeSavedMinutes7d,
    nlActionShare7d: uiMetrics.nlActionShare7d,
    autonomousActions7d: uiMetrics.autonomousActions7d,
    lowRiskAutonomous24h: uiMetrics.lowRiskAutonomous24h,
    commands7d: uiMetrics.commands7d,
    manualNavEvents7d: uiMetrics.manualNavEvents7d,
    proactiveCount,
    timestamp: new Date().toISOString(),
  };
}
