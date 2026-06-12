import { ReactNode } from 'react';
import React from 'react';

type InsightStateVariant = 'idle' | 'active' | 'urgent';

const variantStyles: Record<InsightStateVariant, string> = {
  idle: 'border-border/40',
  active: 'border-primary/30',
  urgent: 'border-destructive/40',
};

export default function InsightState({
  variant = 'idle',
  children,
}: {
  variant?: InsightStateVariant;
  children: ReactNode;
}) {
  return <div className={`rounded-lg border p-4 ${variantStyles[variant]}`}>{children}</div>;
}
