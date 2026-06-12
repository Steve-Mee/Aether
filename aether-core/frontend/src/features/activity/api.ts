import { activityRepository } from '@/lib/data';
import { queryKeys } from '@/lib/query/keys';
import type { ActivityFetchParams } from '@/lib/data';

export const activityApi = {
  fetch: (params?: ActivityFetchParams) => activityRepository.fetch(params),
  queryKeys: queryKeys.activity,
};
