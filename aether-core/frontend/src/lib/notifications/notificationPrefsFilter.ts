import type { NotificationCategory, NotificationKind, PushNotificationInput } from './types';
import type { NotificationPrefs } from '@/lib/settings/merchantSettingsTypes';

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

const kindToCategory: Record<NotificationKind, NotificationCategory> = {
  proactive_suggestion: 'proactive_suggestion',
  approval_needed: 'high_risk_approval',
  agent_action: 'autonomous_low_risk',
  goal_progress: 'goal_progress',
  goal_completed: 'goal_progress',
  agent_handoff: 'autonomous_low_risk',
  supplier_change: 'supplier_change',
  system: 'general',
};

export function inferNotificationCategory(input: PushNotificationInput): NotificationCategory {
  if (input.category) return input.category;
  if (input.kind) return kindToCategory[input.kind];
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
  if (/proactief|proactive|suggestie|suggestion/.test(text)) {
    return 'proactive_suggestion';
  }
  if (/doel|goal|milestone|voortgang/.test(text)) {
    return 'goal_progress';
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

export function sortNotifications<T extends { read: boolean; createdAt: string }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
