import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button, EmptyState, SegmentedControl, Skeleton } from '@/components/ui';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import NotificationRow from '@/components/notifications/NotificationRow';
import NotificationGroupMembers from '@/components/notifications/NotificationGroupMembers';
import { useNotificationsPage } from '@/features/notifications/hooks/useNotificationsPage';
import { t } from '@/lib/i18n';
import type { AppNotification, NotificationKind } from '@/types/notification';

type NotificationFilter = 'all' | 'action' | 'goals' | 'agents';

const ACTION_KINDS: NotificationKind[] = ['approval_needed', 'proactive_suggestion'];
const GOAL_KINDS: NotificationKind[] = ['goal_progress', 'goal_completed'];
const AGENT_KINDS: NotificationKind[] = ['agent_action', 'agent_handoff'];

function resolveKind(n: AppNotification): NotificationKind {
  if (n.kind) return n.kind;
  if (n.category === 'high_risk_approval') return 'approval_needed';
  if (n.category === 'proactive_suggestion') return 'proactive_suggestion';
  if (n.category === 'goal_progress') return 'goal_progress';
  if (n.category === 'autonomous_low_risk') return 'agent_action';
  return n.severity === 'action' ? 'approval_needed' : 'system';
}

function matchesFilter(n: AppNotification, filter: NotificationFilter): boolean {
  if (filter === 'all') return true;
  const kind = resolveKind(n);
  if (filter === 'action') return ACTION_KINDS.includes(kind) || n.severity === 'action';
  if (filter === 'goals') return GOAL_KINDS.includes(kind);
  if (filter === 'agents') return AGENT_KINDS.includes(kind);
  return true;
}

export default function NotificationsPage() {
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<NotificationFilter>('all');
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

  const filtered = useMemo(
    () => notifications.filter((n) => matchesFilter(n, filter)),
    [notifications, filter],
  );

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

  const filterOptions = [
    { value: 'all', label: t('notifications.filter.all') },
    { value: 'action', label: t('notifications.filter.action') },
    { value: 'goals', label: t('notifications.filter.goals') },
    { value: 'agents', label: t('notifications.filter.agents') },
  ];

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
          variant="outline"
          size="sm"
          disabled={unreadCount === 0}
          onClick={markAllRead}
        >
          {t('notifications.markAllRead')}
        </Button>
      }
    >
      <div className="mb-4">
        <SegmentedControl
          value={filter}
          onChange={(v) => setFilter(v as NotificationFilter)}
          options={filterOptions}
          aria-label={t('notifications.title')}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2 rounded-xl border border-border/30 overflow-hidden bg-card/40 p-2">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          variant="premium"
          title={t('notifications.empty')}
          icon={<Bell size={32} strokeWidth={1.5} />}
        />
      ) : (
        <ul className="divide-y divide-border/30 rounded-xl border border-border/30 overflow-hidden bg-card/40">
          {filtered.map((n) => {
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
                  expanded={isExpanded}
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
        <div className="py-4 flex justify-center">
          <Skeleton className="h-4 w-24" />
        </div>
      )}

      <p className="text-meta text-muted-foreground mt-6">
        <Link to="/overview" className="text-primary hover:underline">
          {t('notifications.viewOverview')}
        </Link>
      </p>
    </ModulePageLayout>
  );
}
