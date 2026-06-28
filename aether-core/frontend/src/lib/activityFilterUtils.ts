import type {
  ActivityExecutionModeFilter,
  ActivityItem,
  ActivityModuleFilter,
} from '@/types/activity';

export type ActivityExecutionMode = 'autonomous' | 'approval_required' | 'inform_only';

export const ACTIVITY_MODULE_OPTIONS: ActivityModuleFilter[] = [
  'all',
  'admin-command-bar',
  'aether-mail',
  'payment-fulfillment',
];

export const ACTIVITY_EXECUTION_MODE_OPTIONS: ActivityExecutionModeFilter[] = [
  'all',
  'autonomous',
  'approval_required',
  'inform_only',
];

export function inferExecutionMode(item: ActivityItem): ActivityExecutionMode {
  const fromDetails = item.details?.executionMode;
  if (
    fromDetails === 'autonomous' ||
    fromDetails === 'approval_required' ||
    fromDetails === 'inform_only'
  ) {
    return fromDetails;
  }
  switch (item.status) {
    case 'autonomous':
      return 'autonomous';
    case 'pending':
      return 'approval_required';
    case 'info':
      return 'inform_only';
    case 'approved':
    case 'rejected':
      return 'approval_required';
    default:
      return 'inform_only';
  }
}

export function matchesModule(item: ActivityItem, moduleFilter: ActivityModuleFilter): boolean {
  if (moduleFilter === 'all') return true;
  return item.module === moduleFilter;
}

export function matchesExecutionMode(
  item: ActivityItem,
  modeFilter: ActivityExecutionModeFilter,
): boolean {
  if (modeFilter === 'all') return true;
  return inferExecutionMode(item) === modeFilter;
}
