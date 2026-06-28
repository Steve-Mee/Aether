import { getDataAdapter } from '../createDataAdapter';

export const notificationsRepository = {
  list: () => getDataAdapter().fetchNotifications(),
  markRead: (id: string) => getDataAdapter().markNotificationRead(id),
  markAllRead: (ids?: string[]) => getDataAdapter().markAllNotificationsRead(ids),
  dismiss: (id: string) => getDataAdapter().dismissNotification(id),
};
