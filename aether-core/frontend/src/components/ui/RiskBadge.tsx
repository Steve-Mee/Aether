import React from 'react';
import { type RiskBand } from '../../lib/intentNavigation';
import { t } from '../../lib/i18n';

const styles: Record<RiskBand, string> = {
  low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  high: 'bg-red-500/15 text-red-400 border-red-500/30',
};

interface RiskBadgeProps {
  band: RiskBand;
  className?: string;
}

export default function RiskBadge({ band, className = '' }: RiskBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${styles[band]} ${className}`}
    >
      {t(riskKey(band))}
    </span>
  );
}

function riskKey(band: RiskBand): string {
  return `risk.${band}`;
}

export function ConfidenceChip({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const band: RiskBand = pct >= 80 ? 'low' : pct >= 60 ? 'medium' : 'high';
  return (
    <span className="text-xs text-[var(--color-text-subtle)]">
      {pct}% confidence · <RiskBadge band={band} className="ml-1 inline-flex" />
    </span>
  );
}
