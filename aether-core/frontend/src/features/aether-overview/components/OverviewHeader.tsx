import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Settings2 } from 'lucide-react';
import FeatureStatusFromTruth from '@/components/FeatureStatusFromTruth';
import { StatChip } from '@/components/ui/page-header';
import { t } from '@/lib/i18n';
import type { OverviewKpi } from '../lib/overviewPresentation';

interface OverviewHeaderProps {
  kpis: OverviewKpi[];
}

export default function OverviewHeader({ kpis }: OverviewHeaderProps) {
  return (
    <header className="mb-8">
      <div className="flex flex-wrap items-center gap-3">
        <LayoutDashboard className="h-6 w-6 text-primary shrink-0" aria-hidden />
        <h1 className="text-headline font-semibold tracking-tight">{t('overview.title')}</h1>
        <FeatureStatusFromTruth featureKey="aether-overview" />
        <Link
          to="/settings?section=overview"
          className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
          data-testid="overview-layout-settings-link"
        >
          <Settings2 size={14} aria-hidden />
          {t('overview.layoutSettings')}
        </Link>
      </div>
      <p className="text-body text-muted-foreground mt-1 ml-9">{t('overview.subtitle')}</p>
      <div className="mt-4 ml-9 flex flex-wrap gap-2">
        {kpis.map((kpi) => (
          <StatChip key={kpi.id}>{kpi.label}</StatChip>
        ))}
      </div>
    </header>
  );
}
