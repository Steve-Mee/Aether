import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { env } from '@/lib/config/env';
import { notificationsRepository } from '@/lib/data';
import { queryKeys } from '@/lib/query/keys';
import { filterNotificationsByPrefs, resolveLiveNotificationSeed } from './demoSeed';
import type { AetherNotification, PushNotificationInput } from './types';
import { useNotificationUiStore } from '@/lib/stores/uiStore';
import { showCalmToast } from '@/lib/toast';
import { t } from '@/lib/i18n';
import { subscribeActivityItem, subscribeNotification } from '@/lib/aetherLiveBus';
import { announceStatus } from '@/lib/a11y/announceBus';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import { inferNotificationCategory, shouldShowNotification } from './notificationPrefsFilter';
import { trackBusinessEvent } from '@/lib/observability/businessEvents';

const ACTIVITY_WINDOW_MS = 30 * 60 * 1000;

function nextId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function mergeNotificationInbox(
  demo: AetherNotification[],
  api: AetherNotification[],
): AetherNotification[] {
  const seen = new Set<string>();
  const merged: AetherNotification[] = [];
  for (const item of [...demo, ...api]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
  return merged.slice(0, 50);
}

function normalizeInput(input: PushNotificationInput): AetherNotification {
  const category = inferNotificationCategory(input);
  return {
    id: input.id ?? nextId(),
    title: input.title,
    body: input.body,
    severity: input.severity,
    read: false,
    createdAt: input.createdAt ?? new Date().toISOString(),
    href: input.href,
    actionLabel: input.actionLabel,
    source: input.source,
    category,
  };
}

interface NotificationContextValue {
  notifications: AetherNotification[];
  unreadCount: number;
  lastActivityAt: string | null;
  recentActivityCount: number;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  openPanel: () => void;
  push: (input: PushNotificationInput) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { settings, loading: settingsLoading } = useMerchantSettings();
  const [notifications, setNotifications] = useState<AetherNotification[]>([]);
  const [seedApplied, setSeedApplied] = useState(false);
  const [liveActivityTimes, setLiveActivityTimes] = useState<string[]>([]);
  const prevUnreadRef = useRef(0);
  const seedBaselineRef = useRef(false);
  const suppressUnreadAnnounceRef = useRef(false);

  const panelOpen = useNotificationUiStore((s) => s.panelOpen);
  const setPanelOpen = useNotificationUiStore((s) => s.setPanelOpen);
  const openPanel = useNotificationUiStore((s) => s.openPanel);

  const { data: mockInbox } = useQuery({
    queryKey: queryKeys.notifications.inbox(),
    queryFn: () => notificationsRepository.list(),
    enabled: env.isMockMode && !settingsLoading,
    staleTime: Infinity,
  });

  const { data: liveInbox } = useQuery({
    queryKey: [...queryKeys.notifications.inbox(), 'live'],
    queryFn: () => notificationsRepository.list(),
    enabled: env.isLiveMode && !settingsLoading,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (settingsLoading || seedApplied) return;
    if (env.isMockMode) {
      if (!mockInbox) return;
      setNotifications(filterNotificationsByPrefs(mockInbox, settings.notificationPrefs));
      setSeedApplied(true);
      return;
    }
    if (liveInbox === undefined) return;
    const demoSeed = resolveLiveNotificationSeed({
      hybridDemo: env.hybridDemo,
      liveDemo: env.liveDemo,
    });
    const merged = mergeNotificationInbox(demoSeed, liveInbox);
    setNotifications(filterNotificationsByPrefs(merged, settings.notificationPrefs));
    setSeedApplied(true);
  }, [settingsLoading, settings.notificationPrefs, seedApplied, mockInbox, liveInbox]);

  useEffect(() => {
    if (!seedApplied) return;
    setNotifications((prev) => filterNotificationsByPrefs(prev, settings.notificationPrefs));
  }, [settings.notificationPrefs, seedApplied]);

  const push = useCallback(
    (input: PushNotificationInput) => {
      if (!shouldShowNotification(settings.notificationPrefs, input)) return;
      const item = normalizeInput(input);
      if (input.skipAnnounce) {
        suppressUnreadAnnounceRef.current = true;
      }
      setNotifications((prev) => [item, ...prev].slice(0, 50));
      if (input.severity === 'warning' || input.severity === 'action') {
        showCalmToast({
          variant: 'warning',
          title: input.title,
          description: input.body,
          action:
            input.severity === 'action'
              ? {
                  label: input.actionLabel ?? t('notifications.open'),
                  onClick: () => setPanelOpen(true),
                }
              : undefined,
        });
      } else if (input.severity === 'info' && !input.skipAnnounce) {
        announceStatus(input.body ? `${input.title}. ${input.body}` : input.title);
      }
    },
    [settings.notificationPrefs, setPanelOpen],
  );

  useEffect(() => subscribeNotification(push), [push]);

  useEffect(
    () =>
      subscribeActivityItem((item) => {
        setLiveActivityTimes((prev) => [item.at, ...prev].slice(0, 50));
      }),
    [],
  );

  const markRead = useCallback((id: string) => {
    trackBusinessEvent('notification.read', { action: 'read' });
    setNotifications((prev) => {
      if (env.isLiveMode) {
        void notificationsRepository.markRead(id).catch(() => {
          setNotifications((current) =>
            current.map((n) => (n.id === id ? { ...n, read: false } : n)),
          );
        });
      }
      return prev.map((n) => (n.id === id ? { ...n, read: true } : n));
    });
  }, []);

  const markAllRead = useCallback(() => {
    trackBusinessEvent('notification.read', { action: 'markAll' });
    suppressUnreadAnnounceRef.current = true;
    setNotifications((prev) => {
      const ids = prev.map((n) => n.id);
      if (env.isLiveMode) {
        void notificationsRepository.markAllRead(ids).catch(() => {
          setNotifications(prev);
        });
      }
      return prev.map((n) => ({ ...n, read: true }));
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    trackBusinessEvent('notification.read', { action: 'dismiss' });
    setNotifications((prev) => {
      if (env.isLiveMode) {
        void notificationsRepository.dismiss(id).catch(() => {
          setNotifications(prev);
        });
      }
      return prev.filter((n) => n.id !== id);
    });
  }, []);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  useEffect(() => {
    if (!seedApplied || seedBaselineRef.current) return;
    seedBaselineRef.current = true;
    prevUnreadRef.current = unreadCount;
  }, [seedApplied, unreadCount]);

  useEffect(() => {
    if (suppressUnreadAnnounceRef.current) {
      suppressUnreadAnnounceRef.current = false;
      prevUnreadRef.current = unreadCount;
      return;
    }
    if (unreadCount > prevUnreadRef.current) {
      const delta = unreadCount - prevUnreadRef.current;
      announceStatus(t('notifications.unreadAnnounce').replace('{count}', String(delta)));
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  const lastActivityAt = useMemo(() => {
    const stamps = [
      ...notifications.map((n) => new Date(n.createdAt).getTime()),
      ...liveActivityTimes.map((t) => new Date(t).getTime()),
    ].filter((t) => !Number.isNaN(t));
    if (stamps.length === 0) return null;
    return new Date(Math.max(...stamps)).toISOString();
  }, [notifications, liveActivityTimes]);

  const recentActivityCount = useMemo(() => {
    const cutoff = Date.now() - ACTIVITY_WINDOW_MS;
    const notifInWindow = notifications.filter(
      (n) => new Date(n.createdAt).getTime() >= cutoff,
    ).length;
    const liveInWindow = liveActivityTimes.filter((t) => new Date(t).getTime() >= cutoff).length;
    return notifInWindow + liveInWindow;
  }, [notifications, liveActivityTimes]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      lastActivityAt,
      recentActivityCount,
      panelOpen,
      setPanelOpen,
      openPanel,
      push,
      markRead,
      markAllRead,
      dismiss,
    }),
    [
      notifications,
      unreadCount,
      lastActivityAt,
      recentActivityCount,
      panelOpen,
      openPanel,
      push,
      markRead,
      markAllRead,
      dismiss,
    ],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
}

export function notify(input: PushNotificationInput): void {
  window.dispatchEvent(new CustomEvent('aether:notification', { detail: input }));
}
