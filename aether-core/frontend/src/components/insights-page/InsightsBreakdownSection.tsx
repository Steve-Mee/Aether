import React from 'react';
import { Skeleton } from '@/components/ui';
import { SectionLabel } from '@/components/command-center/primitives';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import type { InsightsViewModel } from '@/lib/mergeInsightsViewModel';
import InsightsBreakdownPanel from './InsightsBreakdownPanel';

interface InsightsBreakdownSectionProps {
  viewModel: InsightsViewModel;
  refreshing?: boolean;
}

export default function InsightsBreakdownSection({
  viewModel,
  refreshing = false,
}: InsightsBreakdownSectionProps) {
  const { sources } = viewModel;

  return (
    <section className={cn('mb-10 animate-fade-in', refreshing && 'opacity-80')}>
      <SectionLabel
        title={t('insights.breakdown.title')}
        subtitle={t('insights.breakdown.subtitle')}
      />
      <div className="relative grid gap-aether-4 md:grid-cols-3">
        {refreshing && (
          <div className="absolute inset-0 z-10 grid gap-aether-4 md:grid-cols-3 pointer-events-none">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/35 bg-card/80 p-6">
                <Skeleton className="h-4 w-32 mb-4" variant="text" />
                <Skeleton lines={3} />
              </div>
            ))}
          </div>
        )}
        <InsightsBreakdownPanel
          title={t('insights.breakdown.categories')}
          rows={viewModel.topCategories}
          source={sources.topCategories}
          demoHint={sources.topCategories === 'demo'}
        />
        <InsightsBreakdownPanel
          title={t('insights.breakdown.suppliers')}
          rows={viewModel.topSuppliers}
          source={sources.topSuppliers}
          demoHint={sources.topSuppliers === 'demo'}
        />
        <InsightsBreakdownPanel
          title={t('insights.breakdown.peak')}
          rows={viewModel.peakAutonomy}
          source={sources.peakAutonomy}
          demoHint={sources.peakAutonomy === 'demo'}
        />
      </div>
    </section>
  );
}
