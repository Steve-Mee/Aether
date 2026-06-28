import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../api/notificationsApi';
import { queryKeys } from '@/lib/query/keys';
import { useNotifications } from '@/lib/notifications/NotificationContext';

export function useNotificationsPage(groupKey?: string) {
  const navigate = useNavigate();
  const { markRead, markAllRead, dismiss } = useNotifications();

  const query = useInfiniteQuery({
    queryKey: [...queryKeys.notifications.inbox(), 'page', groupKey ?? 'all'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      notificationsApi.fetchPage({ limit: 25, cursor: pageParam, groupKey }),
    getNextPageParam: (last) => (last.hasMore ? (last.nextCursor ?? undefined) : undefined),
  });

  const notifications = query.data?.pages.flatMap((p) => p.notifications) ?? [];
  const unreadCount =
    query.data?.pages[0]?.unreadCount ?? notifications.filter((n) => !n.read).length;

  const handleSelect = (id: string, href?: string) => {
    markRead(id);
    if (href) navigate(href);
  };

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    markRead,
    markAllRead,
    dismiss,
    handleSelect,
  };
}
