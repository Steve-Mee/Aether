import { getDataAdapter } from '../createDataAdapter';
import type { ActivityFetchParams } from '../adapters/DataAdapter';

export const activityRepository = {
  fetch: (params?: ActivityFetchParams) => getDataAdapter().fetchActivity(params),
  fetchSince: (since: string, limit = 100) => getDataAdapter().fetchActivity({ since, limit }),
};
