import { AlertCircle, ArrowRight, Info, X } from 'lucide-react';
import { cn, focusRing } from '@/lib/utils';
import { t } from '@/lib/i18n';
import type { AetherNotification, NotificationSeverity } from '@/lib/notifications/types';

const severityStyles: Record<
  NotificationSeverity,
  { stripe: string; icon: typeof Info; iconClass: string }
> = {
  info: {
    stripe: 'bg-muted/50',
    icon: Info,
    iconClass: 'text-muted-foreground',
  },
  warning: {
    stripe: 'bg-warning/20',
    icon: AlertCircle,
    iconClass: 'text-warning',
  },
  action: {
    stripe: 'bg-primary/25',
    icon: AlertCircle,
    iconClass: 'text-primary',
  },
};

interface NotificationRowProps {
  notification: AetherNotification;
  onSelect: (notification: AetherNotification) => void;
  onDismiss: (id: string) => void;
}

export default function NotificationRow({
  notification,
  onSelect,
  onDismiss,
}: NotificationRowProps) {
  const style = severityStyles[notification.severity];
  const Icon = style.icon;

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
        onClick={() => onSelect(notification)}
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
          <p className="text-body font-medium text-foreground truncate">{notification.title}</p>
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
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notification.id);
        }}
        className={cn(
          'shrink-0 p-1 rounded-md text-caption-accessible hover:text-muted-foreground',
          'hover:bg-muted/20 transition-colors duration-fast',
          focusRing(),
        )}
        aria-label={t('notifications.dismiss')}
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  );
}
