import { adminHandlers } from './admin';
import { approvalsHandlers } from './approvals';

export const handlers = [...adminHandlers, ...approvalsHandlers];
export {
  resetMswState,
  setMswResolveFails,
  setMswExecuteFails,
  appendMswActivityItem,
  getMswActivityFeed,
} from './state';
