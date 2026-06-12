import { useQuery } from '@tanstack/react-query';
import { settingsRepository } from '@/lib/data';
import { aetherErrorMessage } from '@/lib/query/hooks';
import { queryKeys } from '@/lib/query/keys';

export function useOperatingMetricsQuery() {
  const query = useQuery({
    queryKey: queryKeys.operatingMetrics(),
    queryFn: () => settingsRepository.operatingMetrics(),
    meta: { domain: 'settings' },
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: aetherErrorMessage(query.error),
    reload: () => void query.refetch(),
  };
}
