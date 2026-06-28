import { Target } from 'lucide-react';
import type { MerchantGoal } from '@/types/goals';
import { t } from '@/lib/i18n';

interface GoalSummaryStripProps {
  goals: MerchantGoal[];
}

export default function GoalSummaryStrip({ goals }: GoalSummaryStripProps) {
  const active = goals.filter((g) => g.status === 'active');
  const onTrack = active.filter((g) => (g.progressPct ?? 0) >= 50).length;
  const behind = active.filter((g) => (g.progressPct ?? 0) < 50).length;

  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard label={t('goals.summary.active')} value={String(active.length)} />
      <StatCard label={t('goals.summary.onTrack')} value={String(onTrack)} />
      <StatCard label={t('goals.summary.behind')} value={String(behind)} highlight={behind > 0} />
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${highlight ? 'border-warning/35 bg-warning/5' : 'border-border/30 bg-card/40'}`}
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Target size={14} />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
