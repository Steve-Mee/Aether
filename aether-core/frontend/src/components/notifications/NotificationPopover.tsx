import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button, EmptyState } from '@/components/ui';
import { useNotifications } from '@/lib/notifications/NotificationContext';
import { t } from '@/lib/i18n';
import NotificationRow from './NotificationRow';
import { NOTIFICATION_PANEL_ID } from '@/lib/notifications/notificationPanelId';
import type { AetherNotification } from '@/lib/notifications/types';

interface NotificationPopoverProps {
  children: React.ReactNode;
}

/** Popover root + panel content; place triggers (bell buttons) as children. */
export function NotificationPopover({ children }: NotificationPopoverProps) {
  const navigate = useNavigate();
  const { notifications, unreadCount, panelOpen, setPanelOpen, markRead, markAllRead, dismiss } =
    useNotifications();

  const handleSelect = (n: AetherNotification) => {
    markRead(n.id);
    if (n.href) {
      setPanelOpen(false);
      navigate(n.href);
    }
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
          <div>
            <h2
              className="text-title font-semibold text-foreground"
              id={NOTIFICATION_PANEL_ID}
              data-testid="notification-panel"
            >
              {t('notifications.title')}
            </h2>
            {unreadCount > 0 && (
              <p className="text-meta text-muted-foreground">
                {t('notifications.unread').replace('{count}', String(unreadCount))}
              </p>
            )}
          </div>
        </div>

        <div className="max-h-[min(24rem,70vh)] overflow-y-auto divide-y divide-border/30">
          {notifications.length === 0 ? (
            <EmptyState
              variant="premium"
              title={t('notifications.empty')}
              className="py-10 px-4"
              icon={<Bell size={28} strokeWidth={1.5} />}
            />
          ) : (
            <ul role="list" className="divide-y divide-border/30">
              {notifications.slice(0, 12).map((n) => (
                <li key={n.id}>
                  <NotificationRow notification={n} onSelect={handleSelect} onDismiss={dismiss} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border/40 bg-card/80">
          <Button
            type="button"
            variant="ghost"
            className="text-meta h-8 px-2"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            {t('notifications.markAllRead')}
          </Button>
          <Link
            to="/timeline"
            className="text-meta text-primary hover:underline"
            onClick={() => setPanelOpen(false)}
          >
            {t('notifications.viewActivity')}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
