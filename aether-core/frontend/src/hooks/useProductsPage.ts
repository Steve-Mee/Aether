import { useQuery } from '@tanstack/react-query';
import { productsRepository } from '@/lib/data';
import { aetherErrorMessage } from '@/lib/query/hooks';
import { queryKeys } from '@/lib/query/keys';

export type { ProductRowDemo as ProductRow } from '@/lib/productsPageDemo';

export function useProductsPage() {
  const query = useQuery({
    queryKey: queryKeys.products(),
    queryFn: () => productsRepository.list(),
    meta: { domain: 'products' },
  });

  return {
    products: query.data ?? null,
    loading: query.isLoading,
    error: aetherErrorMessage(query.error),
    reload: () => void query.refetch(),
  };
}
