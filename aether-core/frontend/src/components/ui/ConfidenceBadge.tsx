import React from 'react';

interface ConfidenceBadgeProps {
  confidence: number;
  className?: string;
}

export default function ConfidenceBadge({ confidence, className = '' }: ConfidenceBadgeProps) {
  const pct = Math.round(confidence * 100);
  const tone =
    pct >= 80 ? 'text-[var(--color-success)]' : pct >= 50 ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]';

  return (
    <span
      className={`inline-flex items-center text-xs font-medium tabular-nums ${tone} ${className}`}
      title={`Confidence ${pct}%`}
    >
      {pct}%
    </span>
  );
}
