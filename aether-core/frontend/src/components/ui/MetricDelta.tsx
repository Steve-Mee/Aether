import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface MetricDeltaProps {
  label: string;
  value: string;
  context?: string;
  trend?: 'up' | 'down' | 'neutral';
  urgent?: boolean;
}

export default function MetricDelta({ label, value, context, trend = 'neutral', urgent }: MetricDeltaProps) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] border p-4 transition-colors ${
        urgent ? 'border-[var(--color-warning)]/40' : 'border-[var(--color-border-subtle)]'
      } bg-[var(--color-surface)]`}
    >
      <p className="text-[var(--text-meta)] text-[var(--color-text-subtle)] uppercase tracking-wide">{label}</p>
      <p
        className={`text-2xl font-semibold mt-1 tabular-nums ${
          urgent ? 'text-[var(--color-warning)]' : 'text-[var(--color-text)]'
        }`}
      >
        {value}
      </p>
      {context && (
        <p className="text-xs text-[var(--color-text-muted)] mt-2 flex items-center gap-1">
          {trend === 'up' && <TrendingUp size={12} className="text-[var(--color-success)]" />}
          {trend === 'down' && <TrendingDown size={12} className="text-[var(--color-danger)]" />}
          {context}
        </p>
      )}
    </div>
  );
}
