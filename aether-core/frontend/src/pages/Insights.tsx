import React, { useEffect } from 'react';
import { InsightsPageSkeleton } from '@/components/ui';
import InsightsPageHeader from '@/components/insights-page/InsightsPageHeader';
import InsightsPeriodToolbar from '@/components/insights-page/InsightsPeriodToolbar';
import InsightsOutcomeMetrics from '@/components/insights-page/InsightsOutcomeMetrics';
import InsightsBreakdownSection from '@/components/insights-page/InsightsBreakdownSection';
import InsightsAutonomySection from '@/components/insights-page/InsightsAutonomySection';
import InsightsErrorBanner from '@/components/insights-page/InsightsErrorBanner';
import InsightsMetricsSkeleton from '@/components/insights-page/InsightsMetricsSkeleton';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { t } from '@/lib/i18n';
import { useInsightsPage } from '@/hooks/useInsightsPage';
import { useLiveAnnouncer } from '@/components/a11y/LiveAnnouncer';

export default function Insights() {
  const page = useInsightsPage();
  const { announce } = useLiveAnnouncer();

  useEffect(() => {
    if (page.refreshing) {
      announce(t('a11y.metricsUpdating'));
    }
  }, [page.refreshing, announce]);

  if (page.initialLoading || !page.viewModel) {
    return (
      <ModulePageLayout
        testId="insights-page"
        header={<InsightsPageHeader period={page.period} />}
        loading
        error={null}
        skeleton={<InsightsPageSkeleton />}
        showContextStrip={false}
      >
        {null}
      </ModulePageLayout>
    );
  }

  return (
    <ModulePageLayout
      testId="insights-page"
      header={<InsightsPageHeader period={page.period} />}
      loading={false}
      error={null}
      wrapAsync={false}
    >
      <InsightsPeriodToolbar period={page.period} onPeriodChange={page.setPeriod} />

      {page.error && <InsightsErrorBanner message={page.error} onRetry={page.reload} />}

      <div className="relative mb-10" aria-busy={page.refreshing || undefined}>
        {page.refreshing && (
          <>
            <p className="sr-only" aria-live="polite">
              {t('a11y.metricsUpdating')}
            </p>
            <div className="absolute inset-0 z-10 rounded-xl bg-background/50 backdrop-blur-sm motion-safe:animate-fade-in">
              <InsightsMetricsSkeleton />
            </div>
          </>
        )}
        <InsightsOutcomeMetrics viewModel={page.viewModel} />
      </div>

      <InsightsBreakdownSection viewModel={page.viewModel} refreshing={page.refreshing} />
      <InsightsAutonomySection viewModel={page.viewModel} />
    </ModulePageLayout>
  );
}
