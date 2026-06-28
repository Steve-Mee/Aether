import React from 'react';
import { Skeleton } from '../Skeleton';

export function ApprovalsPageSkeleton() {
  return (
    <div
      className="space-y-6 animate-fade-in"
      aria-busy="true"
      aria-label="Goedkeuringen laden"
      data-testid="approvals-page-skeleton"
    >
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      <Skeleton className="h-10 w-full max-w-md rounded-xl" />

      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export default ApprovalsPageSkeleton;
