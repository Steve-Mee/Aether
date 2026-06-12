import React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { t } from '@/lib/i18n';
import { moduleLinks } from '@/lib/navigation/moduleLinks';
import type { InsightsPeriod } from '@/lib/insightsPageDemo';
import { periodToDays } from '@/lib/insightsPageDemo';
import { cn, focusRing } from '@/lib/utils';

interface InsightsPageHeaderProps {
  period: InsightsPeriod;
}

export default function InsightsPageHeader({ period }: InsightsPageHeaderProps) {
  const days = periodToDays(period);
  const subtitleKey =
    period === '7d'
      ? 'insights.subtitle.7d'
      : period === '90d'
        ? 'insights.subtitle.90d'
        : 'insights.subtitle.30d';

  return (
    <PageHeader
      title={t('insights.title')}
      subtitle={t(subtitleKey).replace('{days}', String(days))}
      featureKey="admin-command-bar"
    >
      <Link
        to={moduleLinks.approvals}
        className={cn(
          'inline-flex items-center h-8 px-3 rounded-lg text-meta',
          'text-muted-foreground hover:text-foreground hover:bg-muted/25 transition-colors duration-fast',
          focusRing(),
        )}
      >
        {t('insights.link.approvals')}
      </Link>
    </PageHeader>
  );
}
