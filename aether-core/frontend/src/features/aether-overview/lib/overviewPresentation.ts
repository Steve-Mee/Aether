import { t } from '@/lib/i18n';
import { enrichApproval } from '@/lib/approvalPresentation';
import type { DashboardSummary } from '@/lib/api';
import type { ApprovalItem } from '@/types/approval';
import type { MerchantGoal } from '@/types/goals';

export interface OverviewKpi {
  id: string;
  label: string;
}

export function buildOverviewKpis(dashboard: DashboardSummary | null): OverviewKpi[] {
  const kpis: OverviewKpi[] = [];

  const proactiveCount = dashboard?.proactiveCount ?? 0;
  if (proactiveCount >= 0) {
    kpis.push({
      id: 'proactive',
      label: t('overview.kpi.proactive').replace('{count}', String(proactiveCount)),
    });
  }

  const pendingApprovals = dashboard?.pendingApprovals ?? 0;
  kpis.push({
    id: 'approvals',
    label: t('overview.kpi.approvals').replace('{count}', String(pendingApprovals)),
  });

  const autonomyRate = dashboard?.autonomyRate;
  if (autonomyRate != null) {
    kpis.push({
      id: 'autonomous',
      label: t('overview.kpi.autonomous').replace('{rate}', String(Math.round(autonomyRate * 100))),
    });
  }

  const actions7d = dashboard?.autonomousActions7d ?? dashboard?.commands7d ?? 0;
  kpis.push({
    id: 'actions',
    label: t('overview.kpi.actions').replace('{count}', String(actions7d)),
  });

  return kpis;
}

export function selectPendingApprovals(approvals: ApprovalItem[], limit = 3) {
  return approvals
    .filter((a) => a.status === 'pending')
    .slice(0, limit)
    .map((item) => enrichApproval(item));
}

export function selectActiveGoals(goals: MerchantGoal[], limit = 3): MerchantGoal[] {
  return goals.filter((g) => g.status === 'active').slice(0, limit);
}

export function hasAttentionItems(pendingCount: number): boolean {
  return pendingCount > 0;
}
