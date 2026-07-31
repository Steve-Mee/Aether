import type { NotificationCursor } from '../../ports/NotificationPort';

export type { NotificationCursor };

export function encodeNotificationCursor(cursor: NotificationCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export function decodeNotificationCursor(raw: string | undefined): NotificationCursor | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as NotificationCursor;
    if (parsed.createdAt && parsed.id) return parsed;
  } catch {
    return null;
  }
  return null;
}
