import React from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface MetricDeltaProps {
  label: string;
  value: string;
  context?: string;
  trend?: 'up' | 'down' | 'neutral';
  urgent?: boolean;
}

export default function MetricDelta({
  label,
  value,
  context,
  trend = 'neutral',
  urgent,
}: MetricDeltaProps) {
  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        urgent ? 'border-warning/40' : 'border-border/40'
      } bg-card`}
    >
      <p className="text-[var(--text-meta)] text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p
        className={`text-2xl font-semibold mt-1 tabular-nums ${
          urgent ? 'text-warning' : 'text-foreground'
        }`}
      >
        {value}
      </p>
      {context && (
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          {trend === 'up' && <TrendingUp size={12} className="text-success" />}
          {trend === 'down' && <TrendingDown size={12} className="text-destructive" />}
          {context}
        </p>
      )}
    </div>
  );
}
