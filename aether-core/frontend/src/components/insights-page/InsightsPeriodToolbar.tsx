import React, { useId, useMemo } from 'react';
import { SegmentedControl } from '@/components/ui';
import { t } from '@/lib/i18n';
import type { InsightsPeriod } from '@/lib/insightsPageDemo';

const PERIODS: InsightsPeriod[] = ['7d', '30d', '90d', 'custom'];

const periodKeys: Record<InsightsPeriod, string> = {
  '7d': 'insights.period.7d',
  '30d': 'insights.period.30d',
  '90d': 'insights.period.90d',
  custom: 'insights.period.custom',
};

interface InsightsPeriodToolbarProps {
  period: InsightsPeriod;
  onPeriodChange: (period: InsightsPeriod) => void;
}

export default function InsightsPeriodToolbar({
  period,
  onPeriodChange,
}: InsightsPeriodToolbarProps) {
  const customHintId = useId();
  const options = useMemo(
    () =>
      PERIODS.map((p) => ({
        value: p,
        label: t(periodKeys[p]),
        disabled: p === 'custom',
        title: p === 'custom' ? t('insights.period.customSoon') : undefined,
        ...(p === 'custom' ? { ariaDescribedBy: customHintId } : {}),
      })),
    [customHintId],
  );

  return (
    <div className="mb-8" data-testid="insights-period-toolbar">
      <p id={customHintId} className="sr-only">
        {t('insights.period.customSoon')}
      </p>
      <SegmentedControl
        options={options}
        value={period}
        onChange={onPeriodChange}
        data-testid="insights-period"
        aria-label={t('a11y.insights.period')}
      />
    </div>
  );
}
