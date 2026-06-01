import { useEffect, useRef, useState } from 'react';
import { apiStreamFetch, apiFetch, DashboardSummary } from './api';

const FALLBACK_POLL_MS = 30_000;

/**
 * Realtime dashboard via SSE (/api/admin/events/stream).
 * Falls back to polling if stream unavailable.
 */
export function useDashboardStream(): {
  data: DashboardSummary | null;
  connected: boolean;
  error: string | null;
  reload: () => void;
} {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reload = () => {
    apiFetch<DashboardSummary>('/api/admin/dashboard')
      .then(setData)
      .catch((e) => setError(String(e instanceof Error ? e.message : e)));
  };

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const startFallback = () => {
      if (fallbackRef.current) return;
      const poll = () => {
        apiFetch<DashboardSummary>('/api/admin/dashboard')
          .then((d) => {
            if (!cancelled) setData(d);
          })
          .catch(() => undefined);
      };
      poll();
      fallbackRef.current = setInterval(poll, FALLBACK_POLL_MS);
    };

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
              const json = JSON.parse(line.slice(5).trim()) as DashboardSummary;
              if (!cancelled) setData(json);
            } catch {
              /* ignore malformed chunk */
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setConnected(false);
          setError(String(err instanceof Error ? err.message : err));
          startFallback();
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
  }, []);

  return { data, connected, error, reload };
}
