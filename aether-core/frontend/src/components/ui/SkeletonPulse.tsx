import React from 'react';

export default function SkeletonPulse({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] ${className}`}
      aria-hidden="true"
    />
  );
}
