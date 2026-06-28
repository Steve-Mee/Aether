import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { emailsRepository } from '@/lib/data';
import { aetherErrorMessage } from '@/lib/query/hooks';
import { queryKeys } from '@/lib/query/keys';

export function useEmailsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [explainOpen, setExplainOpen] = useState(false);

  const listQuery = useQuery({
    queryKey: queryKeys.emails.all(),
    queryFn: () => emailsRepository.list(),
    meta: { domain: 'emails' },
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.emails.detail(selectedId ?? ''),
    queryFn: () => emailsRepository.detail(selectedId!),
    enabled: Boolean(selectedId),
    meta: { domain: 'emails' },
  });

  const reload = () => {
    void listQuery.refetch();
  };

  const reloadDetail = () => {
    void detailQuery.refetch();
  };

  return useMemo(
    () => ({
      emails: listQuery.data ?? null,
      selectedId,
      setSelectedId,
      detail: detailQuery.data ?? null,
      loading: listQuery.isLoading,
      detailLoading: detailQuery.isLoading,
      error: aetherErrorMessage(listQuery.error),
      detailError: aetherErrorMessage(detailQuery.error),
      reload,
      reloadDetail,
      explainOpen,
      setExplainOpen,
    }),
    [
      listQuery.data,
      listQuery.isLoading,
      listQuery.error,
      detailQuery.data,
      detailQuery.isLoading,
      detailQuery.error,
      selectedId,
      explainOpen,
    ],
  );
}
