import React from 'react';
import { Skeleton } from '../Skeleton';

export function SettingsSectionSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl" variant="block" />
      ))}
    </div>
  );
}

export default SettingsSectionSkeleton;
