import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAetherMutation, useAetherQuery, aetherErrorMessage } from '@/lib/query/hooks';
import { showCalmToast } from '@/lib/toast';
import { t } from '@/lib/i18n';
import { websiteApi } from '../api';
import { useActiveWebsiteProject } from './useActiveWebsiteProject';

export function useWebsitePreview() {
  const queryClient = useQueryClient();
  const hub = useActiveWebsiteProject();
  const revisionId = hub.project?.latestRevisionId ?? null;
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [iteratePrompt, setIteratePrompt] = useState('');

  const previewQuery = useAetherQuery(
    websiteApi.queryKeys.preview(revisionId ?? ''),
    () => websiteApi.getPreviewUrl(revisionId!),
    { enabled: Boolean(revisionId) },
  );

  const revisionsQuery = useAetherQuery(
    websiteApi.queryKeys.revisions(hub.project?.id ?? ''),
    () => websiteApi.listRevisions(hub.project!.id),
    { enabled: Boolean(hub.project?.id) },
  );

  const iterate = useAetherMutation({
    meta: { domain: 'website', handled: true },
    mutationFn: async (deltaPrompt: string) => {
      if (!hub.project) throw new Error(t('website.error.noProject'));
      const trimmed = deltaPrompt.trim();
      if (!trimmed) throw new Error(t('website.preview.iterateRequired'));
      return websiteApi.createRevision(hub.project.id, {
        parentRevisionId: revisionId,
        deltaPrompt: trimmed,
      });
    },
    onSuccess: () => {
      setIteratePrompt('');
      void queryClient.invalidateQueries({ queryKey: websiteApi.queryKeys.all() });
      showCalmToast({ variant: 'success', title: t('website.preview.iterateSuccess') });
    },
  });

  const rebuild = useAetherMutation({
    meta: { domain: 'website', handled: true },
    mutationFn: async () => {
      if (!revisionId) throw new Error(t('website.error.noRevision'));
      return websiteApi.startBuild(revisionId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: websiteApi.queryKeys.all() });
      showCalmToast({ variant: 'success', title: t('website.preview.rebuildSuccess') });
    },
  });

  const previewUrl = previewQuery.data?.previewUrl ?? hub.project?.latestPreviewUrl ?? null;
  const loading = hub.loading || (Boolean(revisionId) && previewQuery.isLoading);
  const error =
    hub.error ??
    aetherErrorMessage(previewQuery.error) ??
    aetherErrorMessage(revisionsQuery.error) ??
    null;

  return {
    ...hub,
    revisionId,
    previewUrl,
    device,
    setDevice,
    iteratePrompt,
    setIteratePrompt,
    revisions: revisionsQuery.data ?? [],
    loading,
    error,
    reload: () => {
      hub.reload();
      void previewQuery.refetch();
      void revisionsQuery.refetch();
    },
    iterate,
    rebuild,
  };
}
