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

export default function StatCard({
  title,
  value,
  change,
  icon,
  trend,
  contextLabel,
}: StatCardProps) {
  return (
    <div className="bg-card border border-border/40 rounded-aether p-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-muted-foreground text-sm">{title}</div>
          <div className="text-4xl font-semibold mt-3 tracking-tighter text-foreground">
            {value}
          </div>
        </div>
        <div className="text-3xl opacity-80">{icon}</div>
      </div>
      <div
        className={`mt-4 text-sm flex items-center gap-2 ${trend === 'up' ? 'text-success' : 'text-warning'}`}
      >
        <span>{change}</span>
        {contextLabel && <span className="text-muted-foreground text-xs">{contextLabel}</span>}
      </div>
    </div>
  );
}
