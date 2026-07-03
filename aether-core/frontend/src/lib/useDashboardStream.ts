import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { env } from '@/lib/config';
import { dashboardRepository } from '@/lib/data';
import { toUserMessage } from '@/lib/api/errors';
import { apiStreamFetch, type DashboardSummary } from './api';
import { queryKeys } from './query/keys';
import { dispatchNotification, dispatchNotificationState } from './aetherLiveBus';
import type { NotificationPushEvent, NotificationStateChangedEvent } from '@/types/notification';
import { useOptionalCurrentUser } from '@/lib/auth/AuthProvider';

const FALLBACK_POLL_MS = 60_000;

function syncDashboardCache(
  queryClient: ReturnType<typeof useQueryClient>,
  data: DashboardSummary,
): void {
  queryClient.setQueryData(queryKeys.dashboard(), data);
}

/**
 * Realtime dashboard via SSE (/api/admin/events/stream) in live mode.
 * Mock mode: poll via dashboardRepository (no SSE).
 */
export function useDashboardStream(): {
  data: DashboardSummary | null;
  connected: boolean;
  error: string | null;
  reload: () => void;
} {
  const queryClient = useQueryClient();
  const currentUser = useOptionalCurrentUser();
  const [data, setData] = useState<DashboardSummary | null>(
    () => queryClient.getQueryData<DashboardSummary>(queryKeys.dashboard()) ?? null,
  );
  const [connected, setConnected] = useState(env.isMockMode);
  const [error, setError] = useState<string | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const applyData = (d: DashboardSummary) => {
    setData(d);
    syncDashboardCache(queryClient, d);
  };

  const fetchDashboard = () =>
    dashboardRepository
      .fetch()
      .then(applyData)
      .catch((e) => setError(toUserMessage(e)));

  const fetchDashboardIfStale = () => {
    const state = queryClient.getQueryState(queryKeys.dashboard());
    if (state?.dataUpdatedAt && Date.now() - state.dataUpdatedAt < FALLBACK_POLL_MS) {
      return Promise.resolve();
    }
    return fetchDashboard();
  };

  const reload = () => {
    void fetchDashboard();
  };

  useEffect(() => {
    let cancelled = false;

    const startPoll = () => {
      if (fallbackRef.current) return;
      void fetchDashboardIfStale();
      fallbackRef.current = setInterval(() => {
        if (!cancelled) void fetchDashboardIfStale();
      }, FALLBACK_POLL_MS);
    };

    if (env.isMockMode) {
      setConnected(true);
      setError(null);
      startPoll();
      return () => {
        cancelled = true;
        if (fallbackRef.current) {
          clearInterval(fallbackRef.current);
          fallbackRef.current = null;
        }
      };
    }

    const controller = new AbortController();

    void (async () => {
      try {
        const response = await apiStreamFetch('/api/admin/events/stream', controller.signal);
        if (!response.ok || !response.body) {
          throw new Error('Stream unavailable');
        }

        setConnected(true);
        setError(null);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            const line = part.split('\n').find((l) => l.startsWith('data:'));
            if (!line) continue;
            try {
              const json = JSON.parse(line.slice(5).trim()) as DashboardSummary & {
                type?: string;
                proactiveCount?: number;
                notification?: NotificationPushEvent['notification'];
                actorId?: string;
                notificationId?: string;
                action?: NotificationStateChangedEvent['action'];
              };
              if (json.type === 'proactive_updated') {
                void queryClient.invalidateQueries({ queryKey: queryKeys.proactiveSuggestions() });
                void queryClient.invalidateQueries({ queryKey: ['suggestions'] });
                void queryClient.invalidateQueries({ queryKey: ['goals'] });
                void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.inbox() });
                const current =
                  queryClient.getQueryData<DashboardSummary>(queryKeys.dashboard()) ??
                  ({} as DashboardSummary);
                const next = {
                  ...current,
                  proactiveCount: json.proactiveCount ?? current.proactiveCount ?? 0,
                };
                if (!cancelled) applyData(next);
                continue;
              }
              if (json.type === 'notification_push' && json.notification) {
                const event = json as unknown as NotificationPushEvent;
                if (event.actorId && event.actorId === currentUser?.id) {
                  continue;
                }
                dispatchNotification({
                  ...event.notification,
                  source: event.notification.source ?? 'system',
                });
                void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.inbox() });
                continue;
              }
              if (
                json.type === 'notification_state_changed' &&
                json.actorId &&
                json.notificationId
              ) {
                dispatchNotificationState(json as unknown as NotificationStateChangedEvent);
                void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.inbox() });
                continue;
              }
              if (json.type === 'overview_item') {
                void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.inbox() });
                continue;
              }
              if (!cancelled) applyData(json);
            } catch {
              /* ignore malformed chunk */
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setConnected(false);
          setError(toUserMessage(err));
          startPoll();
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      if (fallbackRef.current) {
        clearInterval(fallbackRef.current);
        fallbackRef.current = null;
      }
    };
  }, [queryClient, currentUser?.id]);

  return { data, connected, error, reload };
}
