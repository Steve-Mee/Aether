import React from 'react';
import { Skeleton } from '@/components/ui';

export default function HomeLandingSkeleton() {
  return (
    <div
      className="w-full space-y-8 motion-safe:animate-fade-in"
      aria-busy="true"
      aria-label="Home laden"
      data-testid="home-landing-skeleton"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" variant="text" />
        <Skeleton className="h-4 w-48" variant="text" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-aether-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="metric" className="w-full h-28 rounded-2xl" />
        ))}
      </div>

      <div className="space-y-3">
        <Skeleton className="h-5 w-56" variant="text" />
        <Skeleton className="h-4 w-full max-w-md" variant="text" />
        <Skeleton className="h-4 w-full max-w-sm" variant="text" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-9 w-40 rounded-xl" />
        </div>
      </div>

      <div className="space-y-2">
        <Skeleton className="h-5 w-40" variant="text" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </div>
  );
}
