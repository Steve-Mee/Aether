import React from 'react';

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export default function Skeleton({ className = '', lines }: SkeletonProps) {
  if (lines) {
    return (
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`animate-pulse bg-[var(--color-surface-elevated)] rounded-[var(--radius-md)] h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`animate-pulse bg-[var(--color-surface-elevated)] rounded-[var(--radius-md)] ${className}`}
      aria-hidden="true"
    />
  );
}
