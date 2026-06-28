import { useQuery } from '@tanstack/react-query';
import { autonomousRepository } from '@/lib/data';
import { aetherErrorMessage } from '@/lib/query/hooks';
import { queryKeys } from '@/lib/query/keys';

export type { AutonomousDecisionRowDemo as AutonomousDecisionRow } from '@/lib/autonomousPageDemo';

export function useAutonomousPage() {
  const query = useQuery({
    queryKey: queryKeys.autonomous(),
    queryFn: () => autonomousRepository.list(),
    meta: { domain: 'autonomous' },
  });

  return {
    decisions: query.data ?? null,
    loading: query.isLoading,
    error: aetherErrorMessage(query.error),
    reload: () => void query.refetch(),
  };
}
