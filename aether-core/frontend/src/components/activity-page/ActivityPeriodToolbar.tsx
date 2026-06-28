import React, { useMemo } from 'react';
import { SegmentedControl } from '@/components/ui';
import { t } from '@/lib/i18n';
import type { ActivityCustomRange, ActivityPeriod } from '@/types/activity';

const PERIODS: ActivityPeriod[] = ['today', '7d', '30d', 'custom'];

const periodKeys: Record<ActivityPeriod, string> = {
  today: 'activity.period.today',
  '7d': 'activity.period.7d',
  '30d': 'activity.period.30d',
  custom: 'activity.period.custom',
};

interface ActivityPeriodToolbarProps {
  period: ActivityPeriod;
  onPeriodChange: (p: ActivityPeriod) => void;
  customRange: ActivityCustomRange;
  onCustomRangeChange: (r: ActivityCustomRange) => void;
}

export default function ActivityPeriodToolbar({
  period,
  onPeriodChange,
  customRange,
  onCustomRangeChange,
}: ActivityPeriodToolbarProps) {
  const options = useMemo(
    () =>
      PERIODS.map((p) => ({
        value: p,
        label: t(periodKeys[p]),
      })),
    [],
  );

  return (
    <div className="mb-6 space-y-4" data-testid="activity-period-toolbar">
      <SegmentedControl
        options={options}
        value={period}
        onChange={onPeriodChange}
        data-testid="activity-period"
        aria-label={t('a11y.insights.period')}
      />
      {period === 'custom' && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-caption text-muted-foreground">
            {t('activity.period.from')}
            <input
              type="date"
              value={customRange.from}
              onChange={(e) => onCustomRangeChange({ ...customRange, from: e.target.value })}
              className="ml-2 rounded-lg border border-border/40 bg-card/50 px-3 py-1.5 text-sm text-foreground transition-colors duration-fast focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </label>
          <label className="text-caption text-muted-foreground">
            {t('activity.period.to')}
            <input
              type="date"
              value={customRange.to}
              onChange={(e) => onCustomRangeChange({ ...customRange, to: e.target.value })}
              className="ml-2 rounded-lg border border-border/40 bg-card/50 px-3 py-1.5 text-sm text-foreground transition-colors duration-fast focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </label>
          {!customRange.from && (
            <span className="text-caption text-muted-foreground">
              {t('activity.period.customHint')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
