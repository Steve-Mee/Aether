import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { env } from '@/lib/config/env';
import { apiStreamFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';
import type { OverviewFeedItem, OverviewFeedResponse } from '../types/overviewFeed';

function patchOverviewCache(
  queryClient: ReturnType<typeof useQueryClient>,
  event: 'created' | 'updated' | 'removed',
  item: OverviewFeedItem,
): void {
  queryClient.setQueriesData<{ pages: OverviewFeedResponse[]; pageParams: unknown[] }>(
    { queryKey: ['aether-overview', 'infinite'] },
    (old) => {
      if (!old?.pages?.length) return old;
      const pages = [...old.pages];
      const first = { ...pages[0]!, items: [...pages[0]!.items] };

      if (event === 'removed') {
        first.items = first.items.filter((i) => !(i.kind === item.kind && i.id === item.id));
      } else if (event === 'updated') {
        first.items = first.items.map((i) => (i.kind === item.kind && i.id === item.id ? item : i));
      } else {
        const exists = first.items.some((i) => i.kind === item.kind && i.id === item.id);
        if (!exists) first.items = [item, ...first.items].slice(0, 50);
      }

      pages[0] = first;
      return { ...old, pages };
    },
  );
}

/** Subscribe to overview_item SSE events and patch infinite query cache. */
export function useOverviewStream(enabled = true): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || env.isMockMode) return;

    const controller = new AbortController();
    let cancelled = false;

    void (async () => {
      try {
        const sinceCursor = queryClient
          .getQueriesData<{ pages: OverviewFeedResponse[] }>({
            queryKey: ['aether-overview', 'infinite'],
          })
          .flatMap(([, data]) => data?.pages?.[0]?.items ?? [])
          .find((item) => item.cursor)?.cursor;
        const streamUrl = sinceCursor
          ? `${'/api/admin/events/stream'}?sinceCursor=${encodeURIComponent(sinceCursor)}`
          : '/api/admin/events/stream';
        const response = await apiStreamFetch(streamUrl, controller.signal);
        if (!response.ok || !response.body) return;

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
              const json = JSON.parse(line.slice(5).trim()) as {
                type?: string;
                event?: 'created' | 'updated' | 'removed';
                item?: OverviewFeedItem;
              };
              if (json.type === 'overview_item' && json.item && json.event) {
                patchOverviewCache(queryClient, json.event, json.item);
                void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
                void queryClient.invalidateQueries({ queryKey: ['aether-overview', 'handoffs'] });
              }
            } catch {
              /* ignore */
            }
          }
        }
      } catch {
        /* stream unavailable */
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled, queryClient]);
}
