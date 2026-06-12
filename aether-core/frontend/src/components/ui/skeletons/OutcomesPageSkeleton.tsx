import React from 'react';
import { Skeleton } from '../Skeleton';

export function OutcomesPageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in" aria-busy="true">
      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

export default OutcomesPageSkeleton;
