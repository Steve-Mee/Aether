import React from 'react';
import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: ReactNode;
  trend: 'up' | 'down';
  contextLabel?: string;
}

export default function StatCard({ title, value, change, icon, trend, contextLabel }: StatCardProps) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-xl)] p-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[var(--color-text-muted)] text-sm">{title}</div>
          <div className="text-4xl font-semibold mt-3 tracking-tighter text-[var(--color-text)]">{value}</div>
        </div>
        <div className="text-3xl opacity-80">{icon}</div>
      </div>
      <div
        className={`mt-4 text-sm flex items-center gap-2 ${trend === 'up' ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}`}
      >
        <span>{change}</span>
        {contextLabel && (
          <span className="text-[var(--color-text-subtle)] text-xs">{contextLabel}</span>
        )}
      </div>
    </div>
  );
}