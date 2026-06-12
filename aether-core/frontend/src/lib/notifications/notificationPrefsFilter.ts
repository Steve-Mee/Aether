import type { NotificationCategory, PushNotificationInput } from './types';
import type { NotificationPrefs } from '@/lib/settings/merchantSettingsTypes';

const categoryToPrefKey: Record<
  NotificationCategory,
  keyof Omit<NotificationPrefs, 'frequency'> | null
> = {
  autonomous_low_risk: 'autonomousLowRisk',
  high_risk_approval: 'highRiskApproval',
  supplier_change: 'supplierChanges',
  weekly_digest: 'weeklyDigest',
  general: null,
};

export function inferNotificationCategory(input: PushNotificationInput): NotificationCategory {
  if (input.category) return input.category;
  const text = `${input.title} ${input.body}`.toLowerCase();
  if (/goedkeuring|approval|high-risk|terugbetaling|refund/.test(text)) {
    return 'high_risk_approval';
  }
  if (/leverancier|supplier|prijsdaling|voorraad/.test(text)) {
    return 'supplier_change';
  }
  if (/autonoom|autonomous|low-risk|sync voltooid/.test(text)) {
    return 'autonomous_low_risk';
  }
  if (/wekelijk|weekly|samenvatting|digest/.test(text)) {
    return 'weekly_digest';
  }
  return 'general';
}

export function shouldShowNotification(
  prefs: NotificationPrefs,
  input: PushNotificationInput,
): boolean {
  const category = inferNotificationCategory(input);
  const key = categoryToPrefKey[category];
  if (!key) return true;
  return prefs[key].inApp;
}
