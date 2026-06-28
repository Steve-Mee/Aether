import { describe, expect, it, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { optimisticListRemove, optimisticPatch, rollbackQueryData } from '../optimistic';

describe('optimistic helpers', () => {
  let queryClient: QueryClient;
  const key = ['items'] as const;

  beforeEach(() => {
    queryClient = new QueryClient();
    queryClient.setQueryData(key, [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]);
  });

  it('optimisticListRemove filters item', async () => {
    const ctx = await optimisticListRemove<{ id: string; name: string }>(queryClient, key, 'a');
    expect(queryClient.getQueryData(key)).toEqual([{ id: 'b', name: 'B' }]);
    rollbackQueryData(queryClient, key, ctx);
    expect(queryClient.getQueryData(key)).toHaveLength(2);
  });

  it('optimisticPatch merges data and rolls back', async () => {
    queryClient.setQueryData(['count'], { count: 2 });
    const ctx = await optimisticPatch<{ count: number }>(queryClient, ['count'], (old) => ({
      count: (old?.count ?? 0) + 1,
    }));
    expect(queryClient.getQueryData(['count'])).toEqual({ count: 3 });
    rollbackQueryData(queryClient, ['count'], ctx);
    expect(queryClient.getQueryData(['count'])).toEqual({ count: 2 });
  });
});
