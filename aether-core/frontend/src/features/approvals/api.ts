import { approvalsRepository } from '@/lib/data';
import { queryKeys } from '@/lib/query/keys';

export const approvalsApi = {
  list: () => approvalsRepository.list(),
  resolve: (id: string, approve: boolean) => approvalsRepository.resolve(id, { approve }),
  autoApply: () => approvalsRepository.autoApply(),
  queryKeys: queryKeys.approvals,
};
