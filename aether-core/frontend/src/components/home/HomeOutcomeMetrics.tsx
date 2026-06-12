import React from 'react';
import InsightsMetricCard from '@/components/insights-page/InsightsMetricCard';
import { t } from '@/lib/i18n';
import type { HomeLandingViewModel } from '@/lib/buildHomeLandingViewModel';
import { cn } from '@/lib/utils';

interface HomeOutcomeMetricsProps {
  viewModel: HomeLandingViewModel;
}

export default function HomeOutcomeMetrics({ viewModel }: HomeOutcomeMetricsProps) {
  const count = viewModel.metrics.length;

  return (
    <section
      className="space-y-4"
      aria-labelledby="home-metrics-heading"
      data-testid="home-outcome-metrics"
    >
      <h2 id="home-metrics-heading" className="sr-only">
        {t('home.summary.subtitle')}
      </h2>
      <div
        className={cn(
          'grid gap-aether-4',
          count === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3',
        )}
      >
        {viewModel.metrics.map((metric) => (
          <InsightsMetricCard
            key={metric.id}
            label={t(metric.labelKey)}
            value={metric.value}
            context={t(metric.contextKey)}
            trend={metric.trend}
            source={metric.source}
            className={metric.urgent ? 'border-warning/35' : undefined}
          />
        ))}
      </div>
    </section>
  );
}
