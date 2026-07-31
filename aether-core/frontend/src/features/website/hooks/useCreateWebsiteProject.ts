import { useQueryClient } from '@tanstack/react-query';
import { useAetherMutation } from '@/lib/query/hooks';
import { showCalmToast } from '@/lib/toast';
import { t } from '@/lib/i18n';
import { ApiError } from '@/lib/api';
import { slugifyPrompt, websiteApi } from '../api';
import type { CreateProjectResponse, SiteBrief } from '../types';

export function useCreateWebsiteProject(options?: {
  onSuccess?: (result: CreateProjectResponse) => void;
}) {
  const queryClient = useQueryClient();

  return useAetherMutation({
    meta: { domain: 'website', handled: true },
    mutationFn: async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed) {
        throw new Error(t('website.create.promptRequired'));
      }

      const brief: SiteBrief = {
        prompt: trimmed,
        localeDefault: 'nl-NL',
        locales: ['nl-NL'],
      };

      let slug = slugifyPrompt(trimmed);
      try {
        return await websiteApi.createProject({ slug, brief });
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
          return websiteApi.createProject({ slug, brief });
        }
        throw err;
      }
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: websiteApi.queryKeys.all() });
      showCalmToast({ variant: 'success', title: t('website.create.success') });
      options?.onSuccess?.(result);
    },
  });
}
