import React from 'react';
import { Skeleton } from '../Skeleton';

export function ModuleListPageSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in" aria-busy="true">
      <Skeleton className="h-16 w-full rounded-2xl" />
      <Skeleton className="h-16 w-full rounded-2xl" />
      <Skeleton className="h-16 w-full rounded-2xl" />
      <Skeleton className="h-16 w-full rounded-2xl" />
    </div>
  );
}

export default ModuleListPageSkeleton;
