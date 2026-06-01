import { ReactNode } from 'react';
import React from 'react';

type InsightStateVariant = 'idle' | 'active' | 'urgent';

const variantStyles: Record<InsightStateVariant, string> = {
  idle: 'border-[var(--color-border-subtle)]',
  active: 'border-[var(--color-accent)]/30',
  urgent: 'border-[var(--color-danger)]/40',
};

export default function InsightState({
  variant = 'idle',
  children,
}: {
  variant?: InsightStateVariant;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-[var(--radius-lg)] border p-4 ${variantStyles[variant]}`}>{children}</div>
  );
}
