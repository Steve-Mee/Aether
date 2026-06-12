import { getDataAdapter } from '../createDataAdapter';

export const dashboardRepository = {
  fetch: () => getDataAdapter().fetchDashboard(),
};
