export const APPROVALS_CLEARED_EVENT = 'aether:approvals-cleared';
export const APPROVALS_CHANGED_EVENT = 'aether:approvals-changed';

export interface ApprovalsChangedDetail {
  pendingCount: number;
}

export function notifyApprovalsQueueEmpty(): void {
  window.dispatchEvent(new CustomEvent(APPROVALS_CLEARED_EVENT));
  notifyApprovalsChanged(0);
}

export function notifyApprovalsChanged(pendingCount: number): void {
  window.dispatchEvent(
    new CustomEvent<ApprovalsChangedDetail>(APPROVALS_CHANGED_EVENT, {
      detail: { pendingCount },
    }),
  );
}
