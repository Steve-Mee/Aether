import React from 'react';
import { Skeleton } from '../Skeleton';

export function InsightsPageSkeleton() {
  return (
    <div
      className="animate-fade-in"
      aria-busy="true"
      aria-label="Inzichten laden"
      data-testid="insights-page-skeleton"
    >
      <div className="mb-8 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-lg" />
        ))}
      </div>

      <div className="mb-10 grid grid-cols-2 lg:grid-cols-3 gap-aether-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="metric" className="w-full" />
        ))}
      </div>

      <Skeleton className="h-4 w-48 mb-2" variant="text" />
      <Skeleton className="h-3 w-64 mb-6" variant="text" />
      <div className="grid gap-aether-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-52 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default InsightsPageSkeleton;
