import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button, EmptyState, Skeleton } from '@/components/ui';
import { useNotifications } from '@/lib/notifications/NotificationContext';
import { t } from '@/lib/i18n';
import NotificationRow from './NotificationRow';
import NotificationGroupMembers from './NotificationGroupMembers';
import { NOTIFICATION_PANEL_ID } from '@/lib/notifications/notificationPanelId';
import type { AetherNotification } from '@/lib/notifications/types';

interface NotificationPopoverProps {
  children: React.ReactNode;
}

function isToday(createdAt: string): boolean {
  const d = new Date(createdAt);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function groupByRecency(items: AetherNotification[]): { key: string; label: string; items: AetherNotification[] }[] {
  const today: AetherNotification[] = [];
  const earlier: AetherNotification[] = [];
  for (const n of items) {
    if (isToday(n.createdAt)) today.push(n);
    else earlier.push(n);
  }
  const groups: { key: string; label: string; items: AetherNotification[] }[] = [];
  if (today.length) groups.push({ key: 'today', label: t('notifications.group.today'), items: today });
  if (earlier.length) groups.push({ key: 'earlier', label: t('notifications.group.earlier'), items: earlier });
  return groups;
}

/** Popover root + panel content; place triggers (bell buttons) as children. */
export function NotificationPopover({ children }: NotificationPopoverProps) {
  const navigate = useNavigate();
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  const {
    notifications,
    unreadCount,
    panelOpen,
    setPanelOpen,
    markRead,
    markAllRead,
    dismiss,
    inboxLoading,
  } = useNotifications();

  const preview = useMemo(() => notifications.slice(0, 12), [notifications]);
  const groups = useMemo(() => groupByRecency(preview), [preview]);

  const handleSelect = (n: AetherNotification) => {
    markRead(n.id);
    if (n.href) {
      setPanelOpen(false);
      navigate(n.href);
    }
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroupKey((prev) => (prev === groupKey ? null : groupKey));
  };

  return (
    <Popover open={panelOpen} onOpenChange={setPanelOpen}>
      {children}
      <PopoverContent
        data-testid="notification-popover"
        className="w-[min(22.5rem,calc(100vw-2rem))] p-0 animate-fade-in"
        align="end"
        sideOffset={8}
        aria-labelledby={NOTIFICATION_PANEL_ID}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2 min-w-0">
            <h2
              className="text-title font-semibold text-foreground"
              id={NOTIFICATION_PANEL_ID}
              data-testid="notification-panel"
            >
              {t('notifications.title')}
            </h2>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary/15 text-[10px] font-semibold text-primary tabular-nums">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        </div>

        <div className="max-h-[min(24rem,70vh)] overflow-y-auto">
          {inboxLoading ? (
            <div className="divide-y divide-border/30 px-4 py-2 space-y-3">
              <Skeleton className="h-14 rounded-lg" />
              <Skeleton className="h-14 rounded-lg" />
              <Skeleton className="h-14 rounded-lg" />
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState
              variant="premium"
              title={t('notifications.empty')}
              className="py-10 px-4"
              icon={<Bell size={28} strokeWidth={1.5} />}
            />
          ) : (
            <ul role="list" className="divide-y divide-border/30">
              {groups.map((group) => (
                <li key={group.key}>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-medium uppercase tracking-widest text-caption-accessible">
                    {group.label}
                  </p>
                  <ul role="list">
                    {group.items.map((n) => {
                      const isGrouped = (n.groupCount ?? 1) > 1 && Boolean(n.groupKey);
                      const isExpanded = isGrouped && n.groupKey === expandedGroupKey;
                      return (
                        <li key={n.id} className="border-t border-border/20 first:border-t-0">
                          <NotificationRow
                            notification={n}
                            onSelect={handleSelect}
                            onMarkRead={markRead}
                            onDismiss={dismiss}
                            onExpandGroup={isGrouped ? toggleGroup : undefined}
                            expanded={isExpanded}
                          />
                          {isExpanded && n.groupKey && (
                            <NotificationGroupMembers
                              groupKey={n.groupKey}
                              onSelect={handleSelect}
                              onMarkRead={markRead}
                              onDismiss={dismiss}
                            />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border/40 bg-card/80">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-meta h-8"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            {t('notifications.markAllRead')}
          </Button>
          <Link
            to="/notifications"
            className="text-meta text-primary hover:underline"
            onClick={() => setPanelOpen(false)}
          >
            {t('notifications.viewAll')}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
