import React from 'react';
import { SectionLabel } from '@/components/command-center/primitives';
import { Card, CardContent, EmptyState } from '@/components/ui';
import { t } from '@/lib/i18n';
import type { InsightsViewModel } from '@/lib/mergeInsightsViewModel';

interface InsightsAutonomySectionProps {
  viewModel: InsightsViewModel;
}

export default function InsightsAutonomySection({ viewModel }: InsightsAutonomySectionProps) {
  const { sources } = viewModel;
  const showAutonomyEmpty =
    viewModel.autonomyBullets.length === 0 && sources.autonomyBullets === 'live';
  const showRecentEmpty = viewModel.recentActions.length === 0 && sources.recentActions === 'live';

  return (
    <section className="animate-fade-in" data-testid="insights-autonomy-section">
      <SectionLabel
        title={t('insights.autonomy.title')}
        subtitle={t('insights.autonomy.subtitle')}
      />
      <Card variant="elevated" padding="md" className="border-border/35 mb-6">
        <CardContent className="p-0">
          {showAutonomyEmpty ? (
            <EmptyState
              variant="premium"
              title={t('insights.autonomy.empty')}
              hint={t('insights.autonomy.emptyHint')}
              className="py-8 px-4"
            />
          ) : (
            <ul className="space-y-3">
              {viewModel.autonomyBullets.map((bullet) => (
                <li key={bullet.labelKey} className="text-body text-foreground">
                  {t(bullet.labelKey).replace('{count}', String(bullet.count))}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <h3 className="text-title font-medium mb-4">{t('insights.recent.title')}</h3>
      {showRecentEmpty ? (
        <EmptyState
          variant="premium"
          title={t('insights.recent.empty')}
          hint={t('insights.recent.emptyHint')}
          className="py-8 px-4"
        />
      ) : (
        <ul className="space-y-3">
          {viewModel.recentActions.map((action, i) => (
            <li
              key={`${action.time}-${i}`}
              className="flex gap-4 rounded-lg border border-border/30 bg-card/50 px-4 py-3"
            >
              <span className="text-meta tabular-nums text-muted-foreground w-10 shrink-0">
                {action.time}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-body text-foreground">{t(action.descriptionKey)}</p>
                <p className="text-caption text-muted-foreground mt-0.5">{t(action.moduleKey)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
