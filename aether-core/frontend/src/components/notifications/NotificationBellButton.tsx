import { Bell } from 'lucide-react';
import { PopoverAnchor } from '@/components/ui/popover';
import { cn, focusRing } from '@/lib/utils';
import { useNotifications } from '@/lib/notifications/NotificationContext';

interface NotificationBellButtonProps {
  className?: string;
  size?: number;
}

/** Anchor + toggle for NotificationPopover (must be inside NotificationPopover). */
export default function NotificationBellButton({
  className,
  size = 20,
}: NotificationBellButtonProps) {
  const { unreadCount, panelOpen, setPanelOpen } = useNotifications();
  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <PopoverAnchor asChild>
      <button
        type="button"
        onClick={() => setPanelOpen(!panelOpen)}
        className={cn(
          'relative p-2 rounded-lg text-muted-foreground hover:text-foreground',
          'hover:bg-surface-elevated/50 transition-colors duration-fast',
          focusRing(),
          className,
        )}
        aria-label={`Notificaties${unreadCount > 0 ? `, ${unreadCount} ongelezen` : ''}`}
        aria-expanded={panelOpen}
        aria-haspopup="dialog"
        data-testid="notification-bell"
      >
        <Bell size={size} aria-hidden />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-1 flex items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
            aria-hidden
          >
            {badgeLabel}
          </span>
        )}
      </button>
    </PopoverAnchor>
  );
}
