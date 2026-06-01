import { Link } from 'react-router-dom';
import React from 'react';
import type { ProposedInsight } from '../../lib/insightComposer';
import Card from '../ui/Card';
import ConfidenceBadge from '../ui/ConfidenceBadge';
import Button from '../ui/Button';
import { t } from '../../lib/i18n';

interface InsightCardProps {
  insight: ProposedInsight;
  onExecute: (insight: ProposedInsight) => void;
  onSnooze?: (insight: ProposedInsight) => void;
  loading?: boolean;
}

const severityBorder: Record<ProposedInsight['severity'], string> = {
  action: 'border-[var(--color-danger)]/30',
  warning: 'border-[var(--color-warning)]/30',
  info: 'border-[var(--color-border-subtle)]',
};

export default function InsightCard({ insight, onExecute, onSnooze, loading }: InsightCardProps) {
  const ctaLabel =
    insight.actionType === 'auto_apply'
      ? t('cockpit.approve')
      : insight.actionType === 'command'
        ? t('cockpit.execute')
        : t('cockpit.view');

  return (
    <Card padding="sm" className={`${severityBorder[insight.severity]} hover:border-[var(--color-accent)]/40 transition-colors`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--color-text)]">{insight.title}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">{insight.detail}</p>
        </div>
        <ConfidenceBadge confidence={insight.confidence} />
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Button variant="primary" size="sm" disabled={loading} onClick={() => onExecute(insight)}>
          {ctaLabel}
        </Button>
        {onSnooze && (
          <Button variant="ghost" size="sm" disabled={loading} onClick={() => onSnooze(insight)}>
            {t('cockpit.snooze')}
          </Button>
        )}
        {insight.href && (
          <Link to={insight.href} className="text-xs text-[var(--color-intent)] hover:underline">
            {t('cockpit.view')}
          </Link>
        )}
      </div>
    </Card>
  );
}
