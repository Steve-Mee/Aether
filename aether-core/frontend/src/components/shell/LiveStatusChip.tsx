import { cn } from '@/lib/utils';
import { useNotifications } from '@/lib/notifications/NotificationContext';
import { t } from '@/lib/i18n';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

interface LiveStatusChipProps {
  className?: string;
  compact?: boolean;
}

export default function LiveStatusChip({ className, compact }: LiveStatusChipProps) {
  const { lastActivityAt } = useNotifications();

  return (
    <div
      className={cn('flex items-center gap-2 text-meta text-muted-foreground', className)}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
        <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-success/40 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-success/80" />
      </span>
      {!compact && (
        <>
          <span className="hidden sm:inline text-foreground/80">{t('live.monitoring')}</span>
          {lastActivityAt && (
            <span className="hidden md:inline text-muted-foreground/80">
              · {t('live.lastActivity').replace('{time}', formatRelativeTime(lastActivityAt))}
            </span>
          )}
        </>
      )}
    </div>
  );
}
