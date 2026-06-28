import { describe, expect, it } from 'vitest';
import {
  inferNotificationCategory,
  shouldShowNotification,
  sortNotifications,
} from '../notificationPrefsFilter';
import { DEFAULT_NOTIFICATION_PREFS } from '@/lib/settings/merchantSettingsTypes';

describe('notificationPrefsFilter', () => {
  it('maps proactive_suggestion category to proactiveSuggestions pref', () => {
    expect(
      shouldShowNotification(DEFAULT_NOTIFICATION_PREFS, {
        title: 'Test',
        body: 'Body',
        severity: 'info',
        source: 'system',
        category: 'proactive_suggestion',
      }),
    ).toBe(true);

    expect(
      shouldShowNotification(
        {
          ...DEFAULT_NOTIFICATION_PREFS,
          proactiveSuggestions: { inApp: false, email: false },
        },
        {
          title: 'Test',
          body: 'Body',
          severity: 'info',
          source: 'system',
          category: 'proactive_suggestion',
        },
      ),
    ).toBe(false);
  });

  it('maps goal_progress category to goalProgress pref', () => {
    expect(
      inferNotificationCategory({
        title: 'Milestone',
        body: '50% bereikt',
        severity: 'info',
        source: 'system',
        kind: 'goal_progress',
      }),
    ).toBe('goal_progress');
  });

  it('sorts unread notifications first', () => {
    const sorted = sortNotifications([
      { read: true, createdAt: '2026-06-02T10:00:00.000Z' },
      { read: false, createdAt: '2026-06-01T10:00:00.000Z' },
      { read: false, createdAt: '2026-06-03T10:00:00.000Z' },
    ]);
    expect(sorted[0].read).toBe(false);
    expect(sorted[0].createdAt).toBe('2026-06-03T10:00:00.000Z');
  });
});
