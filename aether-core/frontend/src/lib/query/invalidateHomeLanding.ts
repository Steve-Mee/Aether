import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys';

/** Invalidate the three queries that power Command Center home landing. */
export function invalidateHomeLandingQueries(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.activity({ days: 7, limit: 5 }),
  });
  void queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list() });
  void queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.overview() });
}
