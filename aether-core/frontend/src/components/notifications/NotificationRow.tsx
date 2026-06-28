import {
  AlertCircle,
  ArrowRight,
  ArrowRightLeft,
  Bot,
  Check,
  ChevronDown,
  ShieldAlert,
  Sparkles,
  Target,
  Truck,
  Info,
  X,
} from 'lucide-react';
import { cn, focusRing } from '@/lib/utils';
import { t } from '@/lib/i18n';
import type {
  AetherNotification,
  NotificationKind,
  NotificationSeverity,
} from '@/lib/notifications/types';

const severityStyles: Record<NotificationSeverity, { stripe: string; iconClass: string }> = {
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

function formatTime(createdAt: string): string {
  const d = new Date(createdAt);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

interface NotificationRowProps {
  notification: AetherNotification;
  onSelect: (notification: AetherNotification) => void;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  /** When set, clicking a grouped row expands instead of navigating. */
  onExpandGroup?: (groupKey: string) => void;
  expanded?: boolean;
}

export default function NotificationRow({
  notification,
  onSelect,
  onMarkRead,
  onDismiss,
  onExpandGroup,
  expanded = false,
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
        'flex gap-2 px-4 py-3 transition-colors duration-fast',
        'motion-safe:hover:bg-muted/15',
        !notification.read && 'bg-muted/10',
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        className={cn('flex flex-1 gap-3 min-w-0 text-left rounded-md', focusRing())}
      >
        <div
          className={cn('w-0.5 shrink-0 rounded-full self-stretch min-h-[2.5rem]', style.stripe)}
        />
        <Icon size={16} className={cn('shrink-0 mt-0.5', style.iconClass)} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-body font-medium text-foreground truncate flex items-center gap-2 min-w-0">
              {notification.title}
              {isGrouped && (
                <span className="inline-flex items-center justify-center min-w-[1.35rem] h-5 px-1.5 rounded-full bg-primary/20 text-[10px] font-semibold text-primary shrink-0">
                  {notification.groupCount}
                </span>
              )}
              {isGrouped && onExpandGroup && (
                <ChevronDown
                  size={14}
                  className={cn(
                    'text-muted-foreground shrink-0 transition-transform duration-fast',
                    expanded && 'rotate-180',
                  )}
                  aria-hidden
                />
              )}
            </p>
            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
              {formatTime(notification.createdAt)}
            </span>
          </div>
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
            aria-label={t('notifications.unread').replace('{count}', '1')}
          />
        )}
      </button>
      <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
        {!notification.read && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
            className={cn(
              'p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors duration-fast',
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
            'p-1.5 rounded-md text-muted-foreground hover:bg-muted/20 transition-colors duration-fast',
            focusRing(),
          )}
          aria-label={t('notifications.dismiss')}
          title={t('notifications.dismiss')}
        >
          <X size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}
