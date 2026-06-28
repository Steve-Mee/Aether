import { cn } from '@/lib/utils';
import { useNotifications } from '@/lib/notifications/NotificationContext';
import { t } from '@/lib/i18n';

interface ActivityPulseProps {
  className?: string;
}

export default function ActivityPulse({ className }: ActivityPulseProps) {
  const { recentActivityCount } = useNotifications();

  if (recentActivityCount === 0) return null;

  return (
    <p className={cn('text-meta text-muted-foreground hidden md:block', className)}>
      {t('activity.recentCount').replace('{count}', String(recentActivityCount))}
    </p>
  );
}
