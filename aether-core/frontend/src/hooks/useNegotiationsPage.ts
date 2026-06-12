import { useQuery } from '@tanstack/react-query';
import { negotiationsRepository } from '@/lib/data';
import { aetherErrorMessage } from '@/lib/query/hooks';
import { queryKeys } from '@/lib/query/keys';
import { t } from '@/lib/i18n';

export type { NegotiationRowDemo as NegotiationRow } from '@/lib/negotiationsPageDemo';

export function useNegotiationsPage() {
  const query = useQuery({
    queryKey: queryKeys.negotiations(),
    queryFn: () => negotiationsRepository.list(),
    meta: { domain: 'negotiations' },
  });

  return {
    items: query.data ?? null,
    loading: query.isLoading,
    error: aetherErrorMessage(query.error) ?? (query.error ? t('negotiations.error') : null),
    reload: () => void query.refetch(),
  };
}
