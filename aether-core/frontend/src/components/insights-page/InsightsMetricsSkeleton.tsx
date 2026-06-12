import React from 'react';
import { Skeleton } from '@/components/ui';

export default function InsightsMetricsSkeleton() {
  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-3 gap-aether-4 pointer-events-none"
      aria-hidden
      data-testid="insights-metrics-skeleton"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} variant="metric" className="w-full" />
      ))}
    </div>
  );
}
