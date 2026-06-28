import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { classifyError, toUserMessage } from '@/lib/api/errors';
import { logger } from '@/lib/observability/logger';
import { showErrorToast } from '@/lib/toast';

type AetherQueryOptions<T> = Omit<UseQueryOptions<T, Error, T, QueryKey>, 'queryKey' | 'queryFn'>;

/**
 * Standard read hook — maps errors via toUserMessage for AsyncBoundary display.
 */
export function useAetherQuery<T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  options?: AetherQueryOptions<T>,
) {
  return useQuery({
    queryKey,
    queryFn,
    ...options,
  });
}

/** Returns a user-facing error string from a query/mutation error, or null. */
export function aetherErrorMessage(error: unknown): string | null {
  if (!error) return null;
  return toUserMessage(error);
}

export interface AetherMutationMeta {
  domain?: string;
  /** Suppress default error toast (caller handles UX). */
  silentToast?: boolean;
  /** Mark mutation error as handled for global MutationCache logging only. */
  handled?: boolean;
}

type AetherMutationOptions<TData, TVariables, TContext> = UseMutationOptions<
  TData,
  Error,
  TVariables,
  TContext
> & {
  meta?: AetherMutationMeta;
  /** @default true — show calm error toast on failure */
  showToastOnError?: boolean;
};

/**
 * Standard write hook — logs errors, optional toast, defers to MutationCache for unhandled.
 */
export function useAetherMutation<TData, TVariables = void, TContext = unknown>(
  options: AetherMutationOptions<TData, TVariables, TContext>,
) {
  const { showToastOnError = true, onError, meta, ...rest } = options;

  return useMutation<TData, Error, TVariables, TContext>({
    ...rest,
    meta: {
      ...meta,
      domain: meta?.domain,
      handled: meta?.handled ?? false,
    },
    onError: (err, variables, context, mutation) => {
      const classified = classifyError(err);
      logger.error(
        'mutation.hook.failed',
        {
          domain: meta?.domain,
          kind: classified.kind,
        },
        err,
      );
      if (showToastOnError && !meta?.silentToast) {
        showErrorToast(toUserMessage(err));
      }
      onError?.(err, variables, context, mutation);
    },
  });
}
