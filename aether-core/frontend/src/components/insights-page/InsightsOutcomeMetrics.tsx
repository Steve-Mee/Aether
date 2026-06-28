import React from 'react';
import { t } from '@/lib/i18n';
import type { InsightsViewModel } from '@/lib/mergeInsightsViewModel';
import InsightsMetricCard from './InsightsMetricCard';

interface InsightsOutcomeMetricsProps {
  viewModel: InsightsViewModel;
}

export default function InsightsOutcomeMetrics({ viewModel }: InsightsOutcomeMetricsProps) {
  const { periodDays, sources } = viewModel;
  const autonomyShare = Math.round(
    (viewModel.autonomousActions.count /
      Math.max(1, viewModel.autonomousActions.count + viewModel.highRiskWithApproval.count)) *
      100,
  );

  return (
    <section
      className="animate-fade-in"
      data-testid="insights-metrics-grid"
      aria-labelledby="insights-metrics-heading"
    >
      <h2 id="insights-metrics-heading" className="sr-only">
        {t('insights.metricsHeading')}
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-aether-4">
        <InsightsMetricCard
          label={t('insights.metric.revenue').replace('{days}', String(periodDays))}
          value={viewModel.revenueUplift.value}
          subValue={t('insights.metric.revenuePercent').replace(
            '{percent}',
            String(viewModel.revenueUplift.percent),
          )}
          context={t('insights.metric.revenueContext')}
          trend={viewModel.revenueUplift.trend}
          source={sources.revenue}
        />
        <InsightsMetricCard
          label={t('insights.metric.timeSaved')}
          value={t('insights.metric.hoursValue').replace(
            '{hours}',
            String(viewModel.timeSaved.hours),
          )}
          context={
            sources.timeSaved === 'live'
              ? t('insights.metric.timeSaved.live')
              : t('insights.metric.timeSaved.estimated')
          }
          trend={viewModel.timeSaved.trend}
          source={sources.timeSaved}
        />
        <InsightsMetricCard
          label={t('insights.metric.autonomous')}
          value={viewModel.autonomousActions.value}
          context={t('insights.metric.autonomousContext').replace(
            '{percent}',
            String(autonomyShare),
          )}
          trend={viewModel.autonomousActions.trend}
          source={sources.autonomousActions}
          dataTestId="insights-metric-autonomous"
        />
        <InsightsMetricCard
          label={t('insights.metric.margin')}
          value={viewModel.marginImprovement.value}
          context={t('insights.metric.marginContext')}
          trend={viewModel.marginImprovement.trend}
          source={sources.marginImprovement}
        />
        <InsightsMetricCard
          label={t('insights.metric.lowRisk')}
          value={viewModel.lowRiskAutonomous.value}
          context={t('insights.metric.lowRiskContext')}
          trend={viewModel.lowRiskAutonomous.trend}
          source={sources.lowRiskAutonomous}
        />
        <InsightsMetricCard
          label={t('insights.metric.highRisk')}
          value={viewModel.highRiskWithApproval.value}
          context={t('insights.metric.highRiskContext')}
          trend={viewModel.highRiskWithApproval.trend}
          source={sources.highRiskWithApproval}
        />
      </div>
    </section>
  );
}
