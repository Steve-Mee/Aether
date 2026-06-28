import type { DashboardSummary } from './api';
import { formatCurrency } from './i18n';
import type { MetricSource, MetricTrend } from './mergeInsightsViewModel';
import type { SupplierOverviewApiResponse } from '@/types/supplier';
import { assessApprovalRisk } from './intentNavigation';
import type { ApprovalItem } from '@/types/approval';
import { moduleLinks } from '@/lib/navigation/moduleLinks';

export interface HomeMetricCard {
  id: string;
  labelKey: string;
  value: string;
  contextKey: string;
  trend: MetricTrend;
  source: MetricSource;
  urgent?: boolean;
}

export interface HomeSummaryBullet {
  id: string;
  labelKey: string;
  count: number;
  href?: string;
}

export interface HomeLandingViewModel {
  metrics: HomeMetricCard[];
  summaryBullets: HomeSummaryBullet[];
  showCalmFallback: boolean;
}

export interface BuildHomeLandingInput {
  dashboard: DashboardSummary | null;
  supplierOverview: SupplierOverviewApiResponse | null;
  highRiskPendingCount: number;
}

export function countHighRiskPendingApprovals(
  approvals: ApprovalItem[] | null | undefined,
): number {
  if (!approvals?.length) return 0;
  return approvals.filter(
    (a) => a.status === 'pending' && assessApprovalRisk(a.module, a.actionType) === 'high',
  ).length;
}

function formatTimeSaved(minutes7d: number): { value: string; source: MetricSource } {
  if (minutes7d <= 0) {
    return { value: '—', source: 'demo' };
  }
  if (minutes7d >= 60) {
    const hours = Math.round((minutes7d / 60) * 10) / 10;
    return { value: `${hours}u`, source: 'live' };
  }
  return { value: `${minutes7d} min`, source: 'live' };
}

function buildSummaryBullets(input: BuildHomeLandingInput): HomeSummaryBullet[] {
  const { dashboard, supplierOverview, highRiskPendingCount } = input;
  const bullets: HomeSummaryBullet[] = [];

  const lowRisk24h = dashboard?.lowRiskAutonomous24h ?? 0;
  if (lowRisk24h > 0) {
    bullets.push({
      id: 'low-risk-auto',
      labelKey: 'home.summary.lowRiskPricing',
      count: lowRisk24h,
      href: moduleLinks.insights,
    });
  }

  const priceDrops = supplierOverview?.stats.priceDropsThisMonth ?? 0;
  if (priceDrops > 0) {
    bullets.push({
      id: 'supplier-drops',
      labelKey: 'home.summary.supplierPriceDrops',
      count: priceDrops,
      href: moduleLinks.suppliers,
    });
  }

  if (highRiskPendingCount > 0) {
    bullets.push({
      id: 'high-risk-approval',
      labelKey: 'home.summary.highRiskApproval',
      count: highRiskPendingCount,
      href: moduleLinks.approvals,
    });
  }

  const pendingTotal = dashboard?.pendingApprovals ?? 0;
  const otherPending = Math.max(0, pendingTotal - highRiskPendingCount);
  if (otherPending > 0 && bullets.length < 4) {
    bullets.push({
      id: 'pending-approvals',
      labelKey: 'home.summary.pendingApprovals',
      count: otherPending,
      href: moduleLinks.approvals,
    });
  }

  const unread = dashboard?.unreadEmails ?? 0;
  if (unread > 0 && bullets.length < 4) {
    bullets.push({
      id: 'unread-mail',
      labelKey: 'home.summary.unreadMail',
      count: unread,
      href: moduleLinks.emails,
    });
  }

  return bullets.slice(0, 4);
}

export function buildHomeLandingViewModel(input: BuildHomeLandingInput): HomeLandingViewModel {
  const { dashboard, highRiskPendingCount } = input;
  const metrics: HomeMetricCard[] = [];

  const uplift = dashboard?.revenueUplift30d ?? 0;
  metrics.push({
    id: 'revenue-uplift',
    labelKey: 'home.metric.revenueUplift',
    value: uplift > 0 ? formatCurrency(uplift) : '—',
    contextKey: uplift > 0 ? 'home.metric.revenueUplift.live' : 'home.metric.revenueUplift.empty',
    trend: uplift > 0 ? 'up' : 'neutral',
    source: uplift > 0 ? 'live' : 'demo',
  });

  const minutes7d = dashboard?.timeSavedMinutes7d ?? 0;
  const timeSaved = formatTimeSaved(minutes7d);
  metrics.push({
    id: 'time-saved',
    labelKey: 'home.metric.timeSaved',
    value: timeSaved.value,
    contextKey:
      timeSaved.source === 'live' ? 'home.metric.timeSaved.live' : 'home.metric.timeSaved.empty',
    trend: timeSaved.source === 'live' ? 'up' : 'neutral',
    source: timeSaved.source,
  });

  const autonomous = dashboard?.autonomousActions7d ?? 0;
  metrics.push({
    id: 'autonomous-actions',
    labelKey: 'home.metric.autonomousActions',
    value: autonomous > 0 ? String(autonomous) : '—',
    contextKey:
      autonomous > 0 ? 'home.metric.autonomousActions.live' : 'home.metric.autonomousActions.empty',
    trend: autonomous > 0 ? 'up' : 'neutral',
    source: autonomous > 0 ? 'live' : 'demo',
  });

  if (highRiskPendingCount > 0) {
    metrics.push({
      id: 'high-risk-approvals',
      labelKey: 'home.metric.highRiskApprovals',
      value: String(highRiskPendingCount),
      contextKey: 'home.metric.highRiskApprovals.context',
      trend: 'down',
      source: 'live',
      urgent: true,
    });
  }

  const summaryBullets = buildSummaryBullets(input);

  return {
    metrics,
    summaryBullets,
    showCalmFallback: summaryBullets.length === 0,
  };
}

export function getTimeGreetingKey(hour: number): string {
  if (hour >= 5 && hour < 12) return 'home.greeting.morning';
  if (hour >= 12 && hour < 18) return 'home.greeting.afternoon';
  if (hour >= 18 && hour < 23) return 'home.greeting.evening';
  return 'home.greeting.welcome';
}
