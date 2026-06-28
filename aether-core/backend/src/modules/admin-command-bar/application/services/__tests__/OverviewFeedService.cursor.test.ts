import { describe, expect, it } from '@jest/globals';
import {
  decodeOverviewCursor,
  encodeOverviewCursor,
  type OverviewFeedItem,
} from '../OverviewFeedService';

function item(
  kind: OverviewFeedItem['kind'],
  at: string,
  id: string,
): OverviewFeedItem {
  return { kind, at, id, cursor: '', payload: {} };
}

function compareItems(a: OverviewFeedItem, b: OverviewFeedItem): number {
  const atDiff = new Date(b.at).getTime() - new Date(a.at).getTime();
  if (atDiff !== 0) return atDiff;
  const kindDiff = b.kind.localeCompare(a.kind);
  if (kindDiff !== 0) return kindDiff;
  return b.id.localeCompare(a.id);
}

describe('OverviewFeedService cursor helpers', () => {
  it('round-trips cursor encoding', () => {
    const raw = encodeOverviewCursor({
      at: '2026-06-01T12:00:00.000Z',
      id: 'abc',
      kind: 'activity',
    });
    expect(decodeOverviewCursor(raw)).toEqual({
      at: '2026-06-01T12:00:00.000Z',
      id: 'abc',
      kind: 'activity',
    });
  });

  it('returns null for invalid cursor', () => {
    expect(decodeOverviewCursor('')).toBeNull();
    expect(decodeOverviewCursor('not-valid')).toBeNull();
  });

  it('sorts items by at desc then kind then id', () => {
    const a = item('activity', '2026-06-02T10:00:00.000Z', '1');
    const b = item('proactive', '2026-06-02T10:00:00.000Z', '2');
    const c = item('approval', '2026-06-03T10:00:00.000Z', '3');
    const sorted = [a, b, c].sort(compareItems);
    expect(sorted.map((i) => i.id)).toEqual(['3', '2', '1']);
  });
});
