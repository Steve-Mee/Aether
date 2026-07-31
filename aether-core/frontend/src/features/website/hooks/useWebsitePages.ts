import { useAetherQuery, aetherErrorMessage } from '@/lib/query/hooks';
import { websiteApi } from '../api';
import { useActiveWebsiteProject } from './useActiveWebsiteProject';

export function useWebsitePages() {
  const hub = useActiveWebsiteProject();
  const revisionId = hub.project?.latestRevisionId ?? null;

  const pagesQuery = useAetherQuery(
    websiteApi.queryKeys.pages(revisionId ?? ''),
    () => websiteApi.listPages(revisionId!),
    { enabled: Boolean(revisionId) },
  );

  return {
    ...hub,
    revisionId,
    pages: pagesQuery.data ?? [],
    loading: hub.loading || (Boolean(revisionId) && pagesQuery.isLoading),
    error: hub.error ?? aetherErrorMessage(pagesQuery.error) ?? null,
    reload: () => {
      hub.reload();
      void pagesQuery.refetch();
    },
  };
}
