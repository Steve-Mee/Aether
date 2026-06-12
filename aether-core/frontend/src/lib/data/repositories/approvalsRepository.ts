import { getDataAdapter } from '../createDataAdapter';
import type { ResolveApprovalInput } from '@/types/approval';

export const approvalsRepository = {
  list: () => getDataAdapter().fetchApprovals(),
  resolve: (id: string, input: ResolveApprovalInput) =>
    getDataAdapter().resolveApproval(id, input.approve),
  autoApply: () => getDataAdapter().autoApplyApprovals(),
};
