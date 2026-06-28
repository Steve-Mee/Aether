import React from 'react';
import { Skeleton } from '../Skeleton';

export function CommandCenterSkeleton() {
  return (
    <div
      className="w-full space-y-8 animate-fade-in"
      aria-busy="true"
      aria-label="Command Center laden"
      data-testid="command-center-skeleton"
    >
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" variant="text" />
        <Skeleton className="h-3 w-56" variant="text" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-4 w-48" variant="text" />
        <Skeleton className="h-3 w-32" variant="text" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton variant="metric" className="w-full" />
          <Skeleton variant="metric" className="w-full" />
          <Skeleton variant="metric" className="w-full" />
        </div>
      </div>
    </div>
  );
}

export default CommandCenterSkeleton;
