import { useQuery } from '@tanstack/react-query';
import { ordersRepository } from '@/lib/data';
import { aetherErrorMessage } from '@/lib/query/hooks';
import { queryKeys } from '@/lib/query/keys';

export type { OrderRowDemo as OrderRow } from '@/lib/ordersPageDemo';

export function useOrdersPage() {
  const query = useQuery({
    queryKey: queryKeys.orders(),
    queryFn: () => ordersRepository.list(),
    meta: { domain: 'orders' },
  });

  return {
    orders: query.data ?? null,
    loading: query.isLoading,
    error: aetherErrorMessage(query.error),
    reload: () => void query.refetch(),
  };
}
