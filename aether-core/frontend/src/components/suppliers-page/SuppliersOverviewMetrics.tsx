import React from 'react';
import InsightsMetricCard from '@/components/insights-page/InsightsMetricCard';
import { t } from '@/lib/i18n';
import type { SupplierOverviewStats } from '@/types/supplier';

interface SuppliersOverviewMetricsProps {
  stats: SupplierOverviewStats;
}

export default function SuppliersOverviewMetrics({ stats }: SuppliersOverviewMetricsProps) {
  return (
    <section
      className="mb-10"
      aria-labelledby="suppliers-metrics-heading"
      data-testid="suppliers-metrics"
    >
      <h2 id="suppliers-metrics-heading" className="sr-only">
        {t('suppliers.metricsHeading')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-aether-4">
        <InsightsMetricCard
          label={t('suppliers.metric.monitored')}
          value={String(stats.totalMonitored)}
          context={t('suppliers.metric.monitoredContext')}
        />
        <InsightsMetricCard
          label={t('suppliers.metric.autoSyncEnabled')}
          value={String(stats.activeAutoSyncs)}
          context={t('suppliers.metric.autoSyncEnabledContext')}
          trend="neutral"
        />
        <InsightsMetricCard
          label={t('suppliers.metric.syncsMonth')}
          value={String(stats.syncsCompletedThisMonth ?? 0)}
          context={t('suppliers.metric.syncsMonthContext')}
          trend={(stats.syncsCompletedThisMonth ?? 0) > 0 ? 'up' : 'neutral'}
        />
        <InsightsMetricCard
          label={t('suppliers.metric.priceDrops')}
          value={String(stats.priceDropsThisMonth)}
          context={t('suppliers.metric.priceDropsContext')}
          trend={stats.priceDropsThisMonth > 0 ? 'down' : 'neutral'}
        />
        <InsightsMetricCard
          label={t('suppliers.metric.autonomous')}
          value={String(stats.autonomousPriceAdjustments)}
          context={t('suppliers.metric.autonomousContext')}
          trend="up"
        />
      </div>
    </section>
  );
}
