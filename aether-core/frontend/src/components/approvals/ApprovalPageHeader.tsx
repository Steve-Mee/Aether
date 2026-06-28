import React from 'react';
import { PageHeader, StatChip } from '@/components/ui/page-header';
import { t } from '@/lib/i18n';
import type { DashboardSummary } from '@/lib/api';

interface ApprovalPageHeaderProps {
  pendingCount: number;
  dashboard: DashboardSummary | null;
}

export default function ApprovalPageHeader({ pendingCount, dashboard }: ApprovalPageHeaderProps) {
  const autonomous = dashboard?.autonomousActions7d ?? 0;

  return (
    <PageHeader
      title={t('nav.approvals')}
      subtitle={t('approvals.subtitle')}
      featureKey="approvals-audit"
    >
      <StatChip>{t('approvals.stat.open').replace('{count}', String(pendingCount))}</StatChip>
      {autonomous > 0 && (
        <StatChip>{t('approvals.stat.autonomous').replace('{count}', String(autonomous))}</StatChip>
      )}
    </PageHeader>
  );
}
