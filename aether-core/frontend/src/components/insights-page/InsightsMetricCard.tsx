import React, { useId } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Badge, Card, CardContent } from '@/components/ui';
import { cn, interactiveSurface } from '@/lib/utils';
import { t } from '@/lib/i18n';
import type { MetricSource, MetricTrend } from '@/lib/mergeInsightsViewModel';

interface InsightsMetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  context?: string;
  trend?: MetricTrend;
  source?: MetricSource;
  className?: string;
  dataTestId?: string;
}

export default function InsightsMetricCard({
  label,
  value,
  subValue,
  context,
  trend = 'neutral',
  source,
  className,
  dataTestId,
}: InsightsMetricCardProps) {
  const labelId = useId();
  const trendText =
    trend === 'up' ? t('insights.trend.up') : trend === 'down' ? t('insights.trend.down') : '';

  return (
    <Card
      variant="elevated"
      padding="md"
      data-testid={dataTestId}
      role="group"
      aria-labelledby={labelId}
      className={cn(
        'border-border/35',
        interactiveSurface('motion-safe:hover:border-border/55'),
        className,
      )}
    >
      <CardContent className="p-0 pt-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p
            id={labelId}
            className="text-xs uppercase tracking-wide text-foreground/90 font-medium"
          >
            {label}
          </p>
          {source === 'demo' && (
            <Badge variant="muted" className="text-xs px-2 py-0 shrink-0 text-foreground/90">
              {t('insights.source.demo')}
            </Badge>
          )}
          {source === 'live' && (
            <Badge variant="live" className="text-xs px-2 py-0 shrink-0">
              {t('insights.source.live')}
            </Badge>
          )}
        </div>
        <p className="text-display font-semibold tabular-nums tracking-tight text-foreground mt-1">
          {value}
        </p>
        {subValue && (
          <p className="text-title font-medium tabular-nums text-foreground/90 mt-1">{subValue}</p>
        )}
        {context && (
          <p className="text-caption text-muted-foreground mt-3 flex items-center gap-1.5">
            {trend === 'up' && (
              <TrendingUp size={12} className="text-success shrink-0" aria-hidden />
            )}
            {trend === 'down' && (
              <TrendingDown size={12} className="text-destructive shrink-0" aria-hidden />
            )}
            {trendText && <span className="sr-only">{trendText}</span>}
            {context}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
