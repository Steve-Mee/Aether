import type { DashboardSummary } from './api';
import { formatCurrency } from './i18n';
import { moduleLinks } from '@/lib/navigation/moduleLinks';

export type InsightSeverity = 'info' | 'warning' | 'action';
export type InsightActionType = 'navigate' | 'command' | 'auto_apply';

export interface ProposedInsight {
  id: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
  confidence: number;
  href?: string;
  command?: string;
  actionType: InsightActionType;
  requiresApproval: boolean;
  riskBand: 'low' | 'medium' | 'high';
}

export function composeInsights(data: DashboardSummary): ProposedInsight[] {
  const insights: ProposedInsight[] = [];

  if (data.pendingApprovals > 0) {
    insights.push({
      id: 'approvals',
      severity: 'action',
      title: `${data.pendingApprovals} goedkeuring${data.pendingApprovals > 1 ? 'en' : ''} open`,
      detail: 'Beslis nu om doorlooptijd te verkorten',
      confidence: 0.92,
      href: moduleLinks.approvals,
      actionType: 'navigate',
      requiresApproval: true,
      riskBand: data.pendingApprovals > 3 ? 'medium' : 'low',
    });
  }

  if (data.lowMarginProducts > 0) {
    insights.push({
      id: 'margin',
      severity: 'warning',
      title: `${data.lowMarginProducts} producten met lage marge`,
      detail: 'Prijsoptimalisatie via intent',
      confidence: 0.78,
      command: 'Toon lage margin producten',
      actionType: 'command',
      requiresApproval: false,
      riskBand: 'medium',
    });
  }

  if (data.unreadEmails > 0) {
    insights.push({
      id: 'mail',
      severity: 'info',
      title: `${data.unreadEmails} open mails`,
      detail: data.emailMetrics
        ? `${Math.round(data.emailMetrics.classificationRate * 100)}% geclassificeerd`
        : 'Inbox vereist aandacht',
      confidence: 0.85,
      href: moduleLinks.emails,
      actionType: 'navigate',
      requiresApproval: false,
      riskBand: 'low',
    });
  }

  if (data.revenueUplift30d > 0) {
    insights.push({
      id: 'uplift',
      severity: 'info',
      title: `${formatCurrency(data.revenueUplift30d)} geverifieerde uplift`,
      detail: 'Bekijk outcome-rapport',
      confidence: 0.95,
      href: moduleLinks.outcomes,
      actionType: 'navigate',
      requiresApproval: false,
      riskBand: 'low',
    });
  }

  if (data.autonomyRate != null && !data.autonomyTargetMet) {
    insights.push({
      id: 'autonomy',
      severity: 'warning',
      title: `Autonomie ${Math.round(data.autonomyRate * 100)}%`,
      detail: 'Onder pilotdoel (70%)',
      confidence: 0.7,
      href: moduleLinks.autonomous,
      actionType: 'navigate',
      requiresApproval: false,
      riskBand: 'medium',
    });
  }

  if (data.pendingApprovals > 0 && data.pendingApprovals <= 5) {
    insights.push({
      id: 'auto-apply',
      severity: 'action',
      title: 'Veilige goedkeuringen batch',
      detail: 'Pas auto-approve policy toe op laag risico',
      confidence: 0.88,
      actionType: 'auto_apply',
      requiresApproval: true,
      riskBand: 'low',
    });
  }

  const order: Record<InsightSeverity, number> = { action: 0, warning: 1, info: 2 };
  return insights.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function morningBriefTop3(data: DashboardSummary): ProposedInsight[] {
  return composeInsights(data).slice(0, 3);
}
