import type { NotificationPrefs } from '../../../../../shared/settings/merchantSettingsTypes';
import type { NotificationCategory } from './notificationTypes';

const categoryToPrefKey: Record<
  NotificationCategory,
  keyof Omit<NotificationPrefs, 'frequency'> | null
> = {
  autonomous_low_risk: 'autonomousLowRisk',
  high_risk_approval: 'highRiskApproval',
  supplier_change: 'supplierChanges',
  weekly_digest: 'weeklyDigest',
  proactive_suggestion: 'proactiveSuggestions',
  goal_progress: 'goalProgress',
  general: null,
};

export function isInAppNotificationEnabled(
  prefs: NotificationPrefs,
  category: NotificationCategory,
): boolean {
  const key = categoryToPrefKey[category];
  if (!key) return true;
  return prefs[key].inApp !== false;
}
