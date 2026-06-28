import {
  AlertCircle,
  ArrowRight,
  ArrowRightLeft,
  Bot,
  Check,
  ShieldAlert,
  Sparkles,
  Target,
  Truck,
  Info,
  X,
} from 'lucide-react';
import { cn, focusRing } from '@/lib/utils';
import { t } from '@/lib/i18n';
import type { AetherNotification, NotificationKind, NotificationSeverity } from '@/lib/notifications/types';

const severityStyles: Record<
  NotificationSeverity,
  { stripe: string; iconClass: string }
> = {
  info: {
    stripe: 'bg-muted/50',
    iconClass: 'text-muted-foreground',
  },
  warning: {
    stripe: 'bg-warning/20',
    iconClass: 'text-warning',
  },
  action: {
    stripe: 'bg-primary/25',
    iconClass: 'text-primary',
  },
};

const kindIcons: Record<NotificationKind, typeof Info> = {
  proactive_suggestion: Sparkles,
  approval_needed: ShieldAlert,
  goal_progress: Target,
  goal_completed: Target,
  agent_action: Bot,
  agent_handoff: ArrowRightLeft,
  supplier_change: Truck,
  system: Info,
};

function resolveKind(notification: AetherNotification): NotificationKind {
  if (notification.kind) return notification.kind;
  switch (notification.category) {
    case 'proactive_suggestion':
      return 'proactive_suggestion';
    case 'high_risk_approval':
      return 'approval_needed';
    case 'goal_progress':
      return 'goal_progress';
    case 'supplier_change':
      return 'supplier_change';
    case 'autonomous_low_risk':
      return 'agent_action';
    default:
      return notification.severity === 'action' ? 'approval_needed' : 'system';
  }
}

interface NotificationRowProps {
  notification: AetherNotification;
  onSelect: (notification: AetherNotification) => void;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  /** When set, clicking a grouped row expands instead of navigating. */
  onExpandGroup?: (groupKey: string) => void;
}

export default function NotificationRow({
  notification,
  onSelect,
  onMarkRead,
  onDismiss,
  onExpandGroup,
}: NotificationRowProps) {
  const kind = resolveKind(notification);
  const style = severityStyles[notification.severity];
  const Icon = kindIcons[kind] ?? AlertCircle;
  const isGrouped = (notification.groupCount ?? 1) > 1 && Boolean(notification.groupKey);

  const handleClick = () => {
    if (isGrouped && notification.groupKey && onExpandGroup) {
      onExpandGroup(notification.groupKey);
      return;
    }
    onSelect(notification);
  };
  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3 transition-colors duration-fast',
        'motion-safe:hover:bg-muted/15',
        !notification.read && 'bg-muted/10',
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'flex flex-1 gap-3 min-w-0 text-left',
          'hover:opacity-90 rounded-md',
          focusRing(),
        )}
      >
        <div
          className={cn('w-0.5 shrink-0 rounded-full self-stretch min-h-[2.5rem]', style.stripe)}
        />
        <Icon size={16} className={cn('shrink-0 mt-0.5', style.iconClass)} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-body font-medium text-foreground truncate flex items-center gap-2">
            {notification.title}
            {isGrouped && (
              <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary/15 text-caption font-semibold text-primary">
                {notification.groupCount}
              </span>
            )}
          </p>
          <p className="text-meta text-muted-foreground line-clamp-2 mt-0.5">{notification.body}</p>
          {notification.actionLabel && notification.href && (
            <span className="inline-flex items-center gap-1 text-meta text-primary mt-1.5">
              {notification.actionLabel}
              <ArrowRight size={12} aria-hidden />
            </span>
          )}
        </div>
        {!notification.read && (
          <span
            className="shrink-0 w-2 h-2 rounded-full bg-primary mt-2 motion-safe:animate-pulse"
            aria-label="Ongelezen"
          />
        )}
      </button>
      <div className="flex shrink-0 flex-col gap-0.5">
        {!notification.read && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
            className={cn(
              'p-1 rounded-md text-caption-accessible hover:text-muted-foreground',
              'hover:bg-muted/20 transition-colors duration-fast',
              focusRing(),
            )}
            aria-label={t('notifications.markRead')}
            title={t('notifications.markRead')}
          >
            <Check size={14} aria-hidden />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(notification.id);
          }}
          className={cn(
            'p-1 rounded-md text-caption-accessible hover:text-muted-foreground',
            'hover:bg-muted/20 transition-colors duration-fast',
            focusRing(),
          )}
          aria-label={t('notifications.dismiss')}
        >
          <X size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}
