import { getDataAdapter } from '@/lib/data/createDataAdapter';
import type { NotificationInboxResponse } from '@/types/notification';

export const notificationsApi = {
  fetchPage(params: {
    limit?: number;
    cursor?: string;
    groupKey?: string;
  }): Promise<NotificationInboxResponse> {
    return getDataAdapter().fetchNotificationsPage(params);
  },
};
