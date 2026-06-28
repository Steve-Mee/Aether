import { insightsRepository } from '@/lib/data';
import { queryKeys } from '@/lib/query/keys';

export const insightsApi = {
  outcomeReport: (days: number) => insightsRepository.outcomeReport(days),
  autonomyMetrics: (days: number) => insightsRepository.autonomyMetrics(days),
  queryKeys: {
    outcomes: queryKeys.outcomes,
    autonomy: queryKeys.autonomyMetrics,
  },
};
