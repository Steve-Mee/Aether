import { useQuery } from '@tanstack/react-query';
import NotificationRow from '@/components/notifications/NotificationRow';
import { Skeleton } from '@/components/ui';
import { notificationsApi } from '@/features/notifications/api/notificationsApi';
import { queryKeys } from '@/lib/query/keys';
import type { AppNotification } from '@/types/notification';

interface NotificationGroupMembersProps {
  groupKey: string;
  onSelect: (item: AppNotification) => void;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

export default function NotificationGroupMembers({
  groupKey,
  onSelect,
  onMarkRead,
  onDismiss,
}: NotificationGroupMembersProps) {
  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.notifications.inbox(), 'group', groupKey],
    queryFn: () => notificationsApi.fetchPage({ groupKey, limit: 50 }),
  });

  if (isLoading) {
    return (
      <div className="px-4 py-2 space-y-2 bg-muted/5">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
    );
  }

  const items = data?.notifications ?? [];
  if (items.length === 0) return null;

  return (
    <ul role="list" className="bg-muted/5 border-t border-border/10">
      {items.map((n) => (
        <li key={n.id} className="pl-6">
          <NotificationRow
            notification={n}
            onSelect={onSelect}
            onMarkRead={onMarkRead}
            onDismiss={onDismiss}
          />
        </li>
      ))}
    </ul>
  );
}
