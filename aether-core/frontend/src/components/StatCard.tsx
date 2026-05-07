import React from 'react';
import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: ReactNode;
  trend: 'up' | 'down';
}

export default function StatCard({ title, value, change, icon, trend }: StatCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-zinc-400 text-sm">{title}</div>
          <div className="text-4xl font-semibold mt-3 tracking-tighter">{value}</div>
        </div>
        <div className="text-3xl opacity-80">{icon}</div>
      </div>
      <div className={`mt-4 text-sm flex items-center gap-1 ${trend === 'up' ? 'text-emerald-400' : 'text-orange-400'}`}>
        {change}
        <span className="text-zinc-500">vs last month</span>
      </div>
    </div>
  );
}