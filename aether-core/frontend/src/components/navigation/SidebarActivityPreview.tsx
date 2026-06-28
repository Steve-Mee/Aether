import { useNotifications } from '@/lib/notifications/NotificationContext';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function SidebarActivityPreview() {
  const { notifications, unreadCount, openPanel, recentActivityCount } = useNotifications();
  const latestUnread = notifications.find((n) => !n.read);

  return (
    <button
      type="button"
      onClick={openPanel}
      className={cn(
        'w-full text-left rounded-lg px-3 py-2.5 mb-2',
        'border border-border/30 bg-muted/10 hover:bg-muted/20 transition-colors duration-fast',
        'focus-visible:shadow-[var(--shadow-focus)]',
      )}
    >
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {t('activity.sidebar.label')}
      </p>
      {recentActivityCount > 0 && (
        <p className="text-meta text-muted-foreground mt-0.5">
          {t('activity.recentCount').replace('{count}', String(recentActivityCount))}
        </p>
      )}
      <p className="text-caption text-foreground/90 mt-1 line-clamp-2">
        {latestUnread?.title ?? t('activity.sidebar.empty')}
      </p>
      {unreadCount > 0 && (
        <p className="text-meta text-primary-readable mt-1">
          {t('notifications.unread').replace('{count}', String(unreadCount))}
        </p>
      )}
    </button>
  );
}
