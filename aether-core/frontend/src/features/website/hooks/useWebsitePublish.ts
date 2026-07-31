import { useQueryClient } from '@tanstack/react-query';
import { useAetherMutation, useAetherQuery, aetherErrorMessage } from '@/lib/query/hooks';
import { showCalmToast } from '@/lib/toast';
import { t } from '@/lib/i18n';
import { websiteApi } from '../api';
import { useActiveWebsiteProject } from './useActiveWebsiteProject';
import type { ProposePublishResponse, SiteQaReport } from '../types';

export function useWebsitePublish(options?: {
  onSuccess?: (result: ProposePublishResponse) => void;
}) {
  const queryClient = useQueryClient();
  const hub = useActiveWebsiteProject();
  const revisionId = hub.project?.latestRevisionId ?? null;

  const revisionQuery = useAetherQuery(
    websiteApi.queryKeys.revision(revisionId ?? ''),
    () => websiteApi.getRevision(revisionId!),
    { enabled: Boolean(revisionId) },
  );

  const propose = useAetherMutation({
    meta: { domain: 'website', handled: true },
    mutationFn: async () => {
      if (!revisionId) throw new Error(t('website.error.noRevision'));
      return websiteApi.proposePublish(revisionId);
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: websiteApi.queryKeys.all() });
      showCalmToast({ variant: 'success', title: t('website.publish.success') });
      options?.onSuccess?.(result);
    },
  });

  const qaReport = (revisionQuery.data?.qaReportJson ?? null) as SiteQaReport | null;
  const qaScore =
    hub.project?.latestQaScore ?? qaReport?.score ?? revisionQuery.data?.qaScore ?? null;

  return {
    ...hub,
    revisionId,
    revision: revisionQuery.data ?? null,
    qaReport,
    qaScore,
    loading: hub.loading || (Boolean(revisionId) && revisionQuery.isLoading),
    error: hub.error ?? aetherErrorMessage(revisionQuery.error) ?? null,
    reload: () => {
      hub.reload();
      void revisionQuery.refetch();
    },
    propose,
  };
}
