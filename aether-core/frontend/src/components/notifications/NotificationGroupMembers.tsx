import { useQuery } from '@tanstack/react-query';
import NotificationRow from '@/components/notifications/NotificationRow';
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
    return <li className="px-4 py-2 text-meta text-muted-foreground">…</li>;
  }

  const items = data?.notifications ?? [];
  if (items.length === 0) return null;

  return (
    <>
      {items.map((n) => (
        <li key={n.id} className="pl-6 bg-muted/5">
          <NotificationRow
            notification={n}
            onSelect={onSelect}
            onMarkRead={onMarkRead}
            onDismiss={onDismiss}
          />
        </li>
      ))}
    </>
  );
}
