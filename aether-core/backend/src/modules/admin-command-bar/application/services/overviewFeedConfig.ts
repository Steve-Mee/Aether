export function isOverviewFeedReadLegacy(): boolean {
  const v = process.env.OVERVIEW_FEED_READ_LEGACY;
  return v === 'true' || v === '1';
}

export function isOverviewFeedBackfillEnabled(): boolean {
  const v = process.env.OVERVIEW_FEED_BACKFILL;
  return v === 'true' || v === '1';
}

export function isOverviewEmailNotificationsEnabled(): boolean {
  const v = process.env.OVERVIEW_EMAIL_NOTIFICATIONS_ENABLED;
  if (v === 'false' || v === '0') return false;
  return v === 'true' || v === '1' || process.env.NODE_ENV === 'production';
}

export function resolveOverviewEmailMaxPerHour(): number {
  const n = parseInt(process.env.OVERVIEW_EMAIL_MAX_PER_HOUR ?? '20', 10);
  return Number.isFinite(n) && n > 0 ? n : 20;
}
