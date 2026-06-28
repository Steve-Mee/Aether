export type NotificationSeverity = 'info' | 'warning' | 'action';

export type NotificationKind =
  | 'proactive_suggestion'
  | 'approval_needed'
  | 'agent_action'
  | 'goal_progress'
  | 'goal_completed'
  | 'agent_handoff'
  | 'supplier_change'
  | 'system';

export type NotificationCategory =
  | 'autonomous_low_risk'
  | 'high_risk_approval'
  | 'supplier_change'
  | 'weekly_digest'
  | 'proactive_suggestion'
  | 'goal_progress'
  | 'general';

export interface MerchantNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  severity: NotificationSeverity;
  read: boolean;
  createdAt: string;
  href?: string;
  actionLabel?: string;
  source: 'system';
  category?: NotificationCategory;
  groupKey?: string;
  groupCount?: number;
}

export const GOAL_MILESTONE_THRESHOLDS = [25, 50, 75, 100] as const;

export type GoalMilestoneThreshold = (typeof GOAL_MILESTONE_THRESHOLDS)[number];

export function kindToCategory(kind: NotificationKind): NotificationCategory {
  switch (kind) {
    case 'proactive_suggestion':
      return 'proactive_suggestion';
    case 'approval_needed':
      return 'high_risk_approval';
    case 'agent_action':
    case 'agent_handoff':
      return 'autonomous_low_risk';
    case 'goal_progress':
    case 'goal_completed':
      return 'goal_progress';
    case 'supplier_change':
      return 'supplier_change';
    default:
      return 'general';
  }
}

export function crossedGoalMilestone(
  previousPct: number,
  currentPct: number,
): GoalMilestoneThreshold | null {
  for (const threshold of GOAL_MILESTONE_THRESHOLDS) {
    if (previousPct < threshold && currentPct >= threshold) {
      return threshold;
    }
  }
  return null;
}

export function goalMilestoneNotificationId(goalId: string, threshold: number): string {
  return `goal-milestone-${goalId}-${threshold}`;
}
