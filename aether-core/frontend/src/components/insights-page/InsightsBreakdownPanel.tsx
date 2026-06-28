import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from '@/components/ui';
import { t } from '@/lib/i18n';
import type { MetricSource } from '@/lib/mergeInsightsViewModel';
import type { InsightsBreakdownRow } from '@/lib/insightsPageDemo';

function resolveRowLabel(row: InsightsBreakdownRow): string {
  if (row.nameKey) return t(row.nameKey);
  return row.name;
}

function resolveRowValue(row: InsightsBreakdownRow): string {
  if (row.valueKey && row.valueCount != null) {
    return t(row.valueKey).replace('{count}', String(row.valueCount));
  }
  return row.value;
}

interface InsightsBreakdownPanelProps {
  title: string;
  rows: InsightsBreakdownRow[];
  source?: MetricSource;
  demoHint?: boolean;
}

export default function InsightsBreakdownPanel({
  title,
  rows,
  source = 'demo',
  demoHint,
}: InsightsBreakdownPanelProps) {
  const showEmpty = rows.length === 0 && source === 'live';
  const showDemoHint = demoHint ?? source === 'demo';

  return (
    <Card variant="elevated" padding="md" className="border-border/35 flex flex-col h-full">
      <CardHeader className="p-0 pb-3">
        <CardTitle className="text-title font-medium">{title}</CardTitle>
        {showDemoHint && rows.length > 0 && (
          <p className="text-caption text-muted-foreground mt-1">
            {t('insights.breakdown.demoHint')}
          </p>
        )}
      </CardHeader>
      <CardContent className="p-0 flex-1">
        {showEmpty ? (
          <EmptyState
            variant="premium"
            title={t('insights.breakdown.empty')}
            hint={t('insights.breakdown.emptyHint')}
            className="py-8 px-4"
          />
        ) : (
          <ol className="space-y-4 motion-safe:animate-fade-in">
            {rows.map((row, index) => (
              <li key={`${resolveRowLabel(row)}-${index}`}>
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <span className="text-body text-foreground">
                    <span className="text-caption-accessible mr-2 tabular-nums">{index + 1}.</span>
                    {resolveRowLabel(row)}
                  </span>
                  <span className="text-meta text-muted-foreground tabular-nums shrink-0">
                    {resolveRowValue(row)}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-muted/15 overflow-hidden" role="presentation">
                  <div
                    className="h-full rounded-full bg-muted/40 transition-all duration-300"
                    style={{ width: `${Math.min(100, row.share)}%` }}
                  />
                </div>
                <span className="sr-only">
                  {t('insights.breakdown.share').replace('{percent}', String(row.share))}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
