import { activityRepository, approvalsRepository, suppliersRepository } from '@/lib/data';
import { queryKeys } from '@/lib/query/keys';

export const homeLandingApi = {
  activity: (days: number) => activityRepository.fetch({ days, limit: 5 }),
  suppliersOverview: () => suppliersRepository.overview(),
  approvals: () => approvalsRepository.list(),
  queryKeys: {
    activity: queryKeys.activity,
    suppliers: queryKeys.suppliers,
    approvals: queryKeys.approvals,
  },
};
