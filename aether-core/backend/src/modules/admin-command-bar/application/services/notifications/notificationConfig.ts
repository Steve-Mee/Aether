export function isNotificationMaterializeEnabled(): boolean {
  const v = process.env.NOTIFICATION_MATERIALIZE_ENABLED;
  if (v === 'false' || v === '0') return false;
  return v === 'true' || v === '1' || process.env.NODE_ENV === 'production';
}

export function isVirtualInboxFallbackEnabled(): boolean {
  return process.env.NOTIFICATION_VIRTUAL_INBOX_FALLBACK === 'true';
}

export const NOTIFICATION_HISTORY_DAYS = 30;

export const PROACTIVE_GROUP_WINDOW_MS = 4 * 60 * 60 * 1000;
export const APPROVAL_GROUP_WINDOW_MS = 60 * 60 * 1000;
