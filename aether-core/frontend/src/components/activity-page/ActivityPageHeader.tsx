import React from 'react';
import { PageHeader, StatChip } from '@/components/ui/page-header';
import { t } from '@/lib/i18n';

interface ActivityPageHeaderProps {
  autonomousCount: number;
  approvedCount: number;
  feedSource: string;
}

export default function ActivityPageHeader({
  autonomousCount,
  approvedCount,
  feedSource,
}: ActivityPageHeaderProps) {
  return (
    <PageHeader
      title={t('activity.title')}
      subtitle={t('activity.subtitle')}
      featureKey="activity-log"
    >
      {autonomousCount > 0 && (
        <StatChip>
          {t('activity.stat.autonomous').replace('{count}', String(autonomousCount))}
        </StatChip>
      )}
      {approvedCount > 0 && (
        <StatChip>{t('activity.stat.approved').replace('{count}', String(approvedCount))}</StatChip>
      )}
      {feedSource === 'hybrid' && <StatChip>{t('activity.stat.hybrid')}</StatChip>}
    </PageHeader>
  );
}
