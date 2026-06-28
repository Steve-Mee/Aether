import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import NotificationRow from '@/components/notifications/NotificationRow';
import NotificationGroupMembers from '@/components/notifications/NotificationGroupMembers';
import { useNotificationsPage } from '@/features/notifications/hooks/useNotificationsPage';
import { t } from '@/lib/i18n';
import type { AppNotification } from '@/types/notification';

export default function NotificationsPage() {
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  const {
    notifications,
    unreadCount,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    markAllRead,
    markRead,
    dismiss,
    handleSelect,
  } = useNotificationsPage();

  const sentinelRef = useRef<HTMLDivElement>(null);

  const onSelect = (item: AppNotification) => handleSelect(item.id, item.href);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroupKey((prev) => (prev === groupKey ? null : groupKey));
  };

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '120px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <ModulePageLayout
      testId="notifications-page"
      title={t('notifications.title')}
      subtitle={
        unreadCount > 0
          ? t('notifications.unread').replace('{count}', String(unreadCount))
          : t('notifications.pageSubtitle')
      }
      loading={isLoading}
      error={null}
      headerExtra={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={unreadCount === 0}
          onClick={markAllRead}
        >
          {t('notifications.markAllRead')}
        </Button>
      }
    >
      {notifications.length === 0 && !isLoading ? (
        <EmptyState
          variant="premium"
          title={t('notifications.empty')}
          icon={<Bell size={32} strokeWidth={1.5} />}
        />
      ) : (
        <ul className="divide-y divide-border/30 rounded-xl border border-border/30 overflow-hidden bg-card/40">
          {notifications.map((n) => {
            const isGrouped = (n.groupCount ?? 1) > 1 && Boolean(n.groupKey);
            const isExpanded = isGrouped && n.groupKey === expandedGroupKey;
            return (
              <li key={n.id}>
                <NotificationRow
                  notification={n}
                  onSelect={onSelect}
                  onMarkRead={markRead}
                  onDismiss={dismiss}
                  onExpandGroup={isGrouped ? toggleGroup : undefined}
                />
                {isExpanded && n.groupKey && (
                  <NotificationGroupMembers
                    groupKey={n.groupKey}
                    onSelect={onSelect}
                    onMarkRead={markRead}
                    onDismiss={dismiss}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div ref={sentinelRef} className="h-8" aria-hidden />

      {isFetchingNextPage && (
        <p className="text-meta text-muted-foreground text-center py-4">…</p>
      )}

      <p className="text-meta text-muted-foreground mt-6">
        <Link to="/overview" className="text-primary hover:underline">
          {t('notifications.viewOverview')}
        </Link>
      </p>
    </ModulePageLayout>
  );
}
