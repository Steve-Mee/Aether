import React from 'react';
import { Skeleton } from '../Skeleton';

export function ActivityPageSkeleton() {
  return (
    <div
      className="space-y-6 animate-fade-in"
      aria-busy="true"
      aria-label="Activiteit laden"
      data-testid="activity-page-skeleton"
    >
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-20 rounded-lg" />
        <Skeleton className="h-9 w-16 rounded-lg" />
        <Skeleton className="h-9 w-20 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
      <Skeleton className="h-10 w-full max-w-md rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default ActivityPageSkeleton;
