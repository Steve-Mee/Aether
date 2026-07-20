import React from 'react';
import { Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader, StatChip } from '@/components/ui/page-header';
import { Button } from '@/components/ui';
import { t } from '@/lib/i18n';
import { env } from '@/lib/config';
import { apiRoutes } from '@/lib/api/routes';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';

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
  const { settings } = useMerchantSettings();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const until = new Date().toISOString();
  const auditHref = apiRoutes.admin.explainAuditExport(since, until, 'json');

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
      <Link to="/overview" className="text-sm font-medium text-primary-readable hover:underline ml-auto">
        {t('overview.link.fromTimeline')} →
      </Link>
      {settings.dataExportEnabled && !env.isMockMode && (
        <Button type="button" variant="outline" size="sm" asChild>
          <a href={auditHref} download>
            <Download size={14} className="mr-1" />
            {t('explain.export.audit')}
          </a>
        </Button>
      )}
    </PageHeader>
  );
}
