import React from 'react';
import { useDashboard } from '../../lib/DashboardContext';
import { t } from '../../lib/i18n';
import { Card } from '@/components/ui';

const TARGET = 0.5;

function bandColor(share: number): string {
  if (share >= TARGET) return 'hsl(var(--success))';
  if (share >= 0.3) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
}

export default function AdoptionMetricCard() {
  const { data } = useDashboard();
  if (!data || data.nlActionShare7d == null) return null;

  const pct = Math.round(data.nlActionShare7d * 100);
  const color = bandColor(data.nlActionShare7d);

  return (
    <Card className="mb-8" data-testid="adoption-metric-card">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t('cockpit.adoption.title')}</h2>
          <p className="text-xs text-muted-foreground mt-1">{t('cockpit.adoption.subtitle')}</p>
        </div>
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>
          {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {t('cockpit.adoption.target')}: 50% · {data.commands7d ?? 0}{' '}
        {t('cockpit.adoption.commands')} / {(data.manualNavEvents7d ?? 0) + (data.commands7d ?? 0)}{' '}
        {t('cockpit.adoption.actions')}
      </p>
    </Card>
  );
}
