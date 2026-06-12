import { describe, expect, it } from 'vitest';
import type { AetherNotification } from '../types';

function unreadCount(items: AetherNotification[]): number {
  return items.filter((n) => !n.read).length;
}

function markAllRead(items: AetherNotification[]): AetherNotification[] {
  return items.map((n) => ({ ...n, read: true }));
}

describe('notification helpers', () => {
  it('counts unread', () => {
    const items: AetherNotification[] = [
      {
        id: '1',
        title: 'A',
        body: 'b',
        severity: 'info',
        read: false,
        createdAt: new Date().toISOString(),
        source: 'system',
      },
      {
        id: '2',
        title: 'B',
        body: 'b',
        severity: 'info',
        read: true,
        createdAt: new Date().toISOString(),
        source: 'system',
      },
    ];
    expect(unreadCount(items)).toBe(1);
  });

  it('marks all read', () => {
    const items: AetherNotification[] = [
      {
        id: '1',
        title: 'A',
        body: 'b',
        severity: 'action',
        read: false,
        createdAt: new Date().toISOString(),
        source: 'system',
      },
    ];
    expect(markAllRead(items).every((n) => n.read)).toBe(true);
  });
});
