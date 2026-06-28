import type { QueryClient, QueryKey } from '@tanstack/react-query';

export interface OptimisticContext<T> {
  previous: T | undefined;
}

export async function optimisticListRemove<T extends { id: string }>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  id: string,
): Promise<OptimisticContext<T[]>> {
  await queryClient.cancelQueries({ queryKey });
  const previous = queryClient.getQueryData<T[]>(queryKey);
  queryClient.setQueryData<T[]>(queryKey, (old) => old?.filter((item) => item.id !== id) ?? []);
  return { previous };
}

export async function optimisticPatch<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  patchFn: (old: T | undefined) => T,
): Promise<OptimisticContext<T>> {
  await queryClient.cancelQueries({ queryKey });
  const previous = queryClient.getQueryData<T>(queryKey);
  queryClient.setQueryData<T>(queryKey, (old) => patchFn(old));
  return { previous };
}

export function rollbackQueryData<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  context: OptimisticContext<T> | undefined,
): void {
  if (context?.previous !== undefined) {
    queryClient.setQueryData(queryKey, context.previous);
  }
}
