import React from 'react';
import { Badge } from './badge';
import { type RiskBand } from '@/lib/intentNavigation';
import { t } from '@/lib/i18n';

const riskVariant: Record<RiskBand, 'riskLow' | 'riskMedium' | 'riskHigh'> = {
  low: 'riskLow',
  medium: 'riskMedium',
  high: 'riskHigh',
};

export interface ConfidenceBadgeProps {
  confidence: number;
  className?: string;
}

/** Displays model confidence as a percentage with semantic tone. */
export function ConfidenceBadge({ confidence, className = '' }: ConfidenceBadgeProps) {
  const pct = Math.round(confidence * 100);
  const tone = pct >= 80 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-destructive';

  return (
    <span
      className={`inline-flex items-center text-xs font-medium tabular-nums ${tone} ${className}`}
      title={`Confidence ${pct}%`}
    >
      {pct}%
    </span>
  );
}

export interface RiskBadgeProps {
  band: RiskBand;
  className?: string;
}

/** Risk band indicator for approvals and workstream items. */
export function RiskBadge({ band, className = '' }: RiskBadgeProps) {
  return (
    <Badge variant={riskVariant[band]} className={className}>
      {t(`risk.${band}`)}
    </Badge>
  );
}

export function ConfidenceChip({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const band: RiskBand = pct >= 80 ? 'low' : pct >= 60 ? 'medium' : 'high';
  return (
    <span className="text-xs text-muted-foreground">
      {pct}% confidence · <RiskBadge band={band} className="ml-1 inline-flex" />
    </span>
  );
}

export default RiskBadge;
