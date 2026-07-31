import type { OverviewCursor, OverviewFeedItem } from './overviewFeedTypes';

export const SOURCE_BATCH = 80;

export function encodeOverviewCursor(c: OverviewCursor): string {
  return Buffer.from(JSON.stringify(c)).toString('base64url');
}

export function decodeOverviewCursor(raw: string | undefined): OverviewCursor | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as OverviewCursor;
    if (parsed.at && parsed.id && parsed.kind) return parsed;
  } catch {
    return null;
  }
  return null;
}

export function compareItems(a: OverviewFeedItem, b: OverviewFeedItem): number {
  const atDiff = new Date(b.at).getTime() - new Date(a.at).getTime();
  if (atDiff !== 0) return atDiff;
  const kindDiff = b.kind.localeCompare(a.kind);
  if (kindDiff !== 0) return kindDiff;
  return b.id.localeCompare(a.id);
}

export function isBeforeCursor(item: OverviewFeedItem, cursor: OverviewCursor): boolean {
  const itemTime = new Date(item.at).getTime();
  const cursorTime = new Date(cursor.at).getTime();
  if (itemTime < cursorTime) return true;
  if (itemTime > cursorTime) return false;
  if (item.kind < cursor.kind) return true;
  if (item.kind > cursor.kind) return false;
  return item.id < cursor.id;
}
