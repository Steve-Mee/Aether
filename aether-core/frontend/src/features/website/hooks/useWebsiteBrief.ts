import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAetherMutation, useAetherQuery, aetherErrorMessage } from '@/lib/query/hooks';
import { showCalmToast } from '@/lib/toast';
import { t } from '@/lib/i18n';
import { websiteApi } from '../api';
import { useActiveWebsiteProject } from './useActiveWebsiteProject';
import type { SiteBrief } from '../types';

const emptyBrief: SiteBrief = {
  prompt: '',
  tone: '',
  audience: '',
  localeDefault: 'nl-NL',
  locales: ['nl-NL'],
  mustHavePages: ['home', 'collection', 'about', 'contact'],
  brand: { name: '', primaryColor: '', accentColor: '' },
};

export function useWebsiteBrief() {
  const queryClient = useQueryClient();
  const hub = useActiveWebsiteProject();
  const revisionId = hub.project?.latestRevisionId ?? null;
  const [draft, setDraft] = useState<SiteBrief>(emptyBrief);

  const revisionQuery = useAetherQuery(
    websiteApi.queryKeys.revision(revisionId ?? ''),
    () => websiteApi.getRevision(revisionId!),
    { enabled: Boolean(revisionId) },
  );

  useEffect(() => {
    const brief = revisionQuery.data?.briefJson;
    if (brief && typeof brief === 'object') {
      setDraft({
        ...emptyBrief,
        ...brief,
        brand: { ...emptyBrief.brand, ...(brief.brand ?? {}) },
        locales: brief.locales ?? emptyBrief.locales,
        mustHavePages: brief.mustHavePages ?? emptyBrief.mustHavePages,
      });
    }
  }, [revisionQuery.data?.briefJson]);

  const save = useAetherMutation({
    meta: { domain: 'website', handled: true },
    mutationFn: async () => {
      if (!hub.project) throw new Error(t('website.error.noProject'));
      return websiteApi.createRevision(hub.project.id, {
        parentRevisionId: revisionId,
        briefPatch: draft,
        deltaPrompt: typeof draft.prompt === 'string' ? draft.prompt : undefined,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: websiteApi.queryKeys.all() });
      showCalmToast({ variant: 'success', title: t('website.brief.saveSuccess') });
    },
  });

  return {
    ...hub,
    revisionId,
    draft,
    setDraft,
    loading: hub.loading || (Boolean(revisionId) && revisionQuery.isLoading),
    error: hub.error ?? aetherErrorMessage(revisionQuery.error) ?? null,
    reload: () => {
      hub.reload();
      void revisionQuery.refetch();
    },
    save,
  };
}
