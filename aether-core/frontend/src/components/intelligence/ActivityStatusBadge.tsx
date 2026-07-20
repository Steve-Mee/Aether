import { Check, Clock, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import type { ActivityStatus } from '@/types/activity';

const statusConfig: Record<
  ActivityStatus,
  { icon: typeof Check; className: string; variant: string }
> = {
  autonomous: {
    icon: Check,
    className: 'border-success/60 bg-success/45 text-emerald-100',
    variant: 'success',
  },
  approved: {
    icon: Check,
    className: 'border-border/50 bg-muted/30 text-foreground/90',
    variant: 'default',
  },
  rejected: {
    icon: X,
    className: 'border-danger/60 bg-danger/40 text-red-100',
    variant: 'danger',
  },
  pending: {
    icon: Clock,
    className: 'border-warning/60 bg-warning/40 text-amber-100',
    variant: 'warning',
  },
  info: {
    icon: Info,
    className: 'border-border/50 bg-muted/30 text-foreground/80',
    variant: 'muted',
  },
};

interface ActivityStatusBadgeProps {
  status: ActivityStatus;
  className?: string;
  size?: 'sm' | 'md';
}

export default function ActivityStatusBadge({
  status,
  className,
  size = 'sm',
}: ActivityStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-0.5';
  const iconSize = size === 'sm' ? 11 : 12;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        sizeClass,
        config.className,
        className,
      )}
      data-status={status}
    >
      <Icon size={iconSize} strokeWidth={2} aria-hidden />
      {t(`activity.status.${status}`)}
    </span>
  );
}
