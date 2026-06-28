import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { env } from '@/lib/config/env';
import { adminRepository } from '@/lib/data/repositories/adminRepository';
import { useCommand } from '@/lib/CommandContext';
import type { DemoIntentId } from '@/lib/localIntentMatcher';
import {
  dismissSuggestion as dismissDemoSuggestion,
  getProactiveSuggestions as getDemoProactiveSuggestions,
  snoozeSuggestion as snoozeDemoSuggestion,
  type ProactiveCategory,
  type ProactiveSuggestion,
} from '@/lib/proactiveSuggestionsDemo';
import { applyMerchantAutonomyFromSuggestion } from '@/lib/settings/applyMerchantAutonomy';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import { queryKeys } from '@/lib/query/keys';
import type { ApiProactiveSuggestion } from '@/types/suggestions';

function categoryToUi(category: string): ProactiveCategory {
  if (category === 'leverancier') return 'leverancier';
  if (category === 'marge' || category === 'prijs') return 'prijs';
  if (category === 'orders' || category === 'voorraad') return 'orders';
  return 'marge';
}

function mapApiToProactive(
  item: ApiProactiveSuggestion,
  settings?: ReturnType<typeof useMerchantSettings>['settings'],
): ProactiveSuggestion {
  const base: ProactiveSuggestion = {
    id: item.id,
    title: item.label,
    impactHint: item.hint,
    category: categoryToUi(item.category),
    intentId: item.intentId as DemoIntentId,
    command: item.command,
    linkedInsightId: null,
    executionMode: item.executionMode ?? 'inform_only',
    hasExplainability: item.hasExplainability ?? env.isLiveMode,
  };
  if (!settings) return base;
  return {
    ...base,
    executionMode: applyMerchantAutonomyFromSuggestion(settings, base),
  };
}

export function useProactiveSuggestions() {
  const { settings } = useMerchantSettings();
  const { executeProactiveStream, streaming, executingProactiveId, streamLiveExplain } = useCommand();
  const queryClient = useQueryClient();

  const liveQuery = useQuery({
    queryKey: queryKeys.proactiveSuggestions(),
    queryFn: () => adminRepository.proactiveSuggestions(),
    enabled: env.isLiveMode,
    staleTime: 30_000,
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) =>
      env.isLiveMode
        ? adminRepository.dismissProactiveSuggestion(id)
        : Promise.resolve(dismissDemoSuggestion(id)),
    onSuccess: () => {
      if (env.isLiveMode) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.proactiveSuggestions() });
        void queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      }
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: (id: string) =>
      env.isLiveMode
        ? adminRepository.snoozeProactiveSuggestion(id)
        : Promise.resolve(snoozeDemoSuggestion(id)),
    onSuccess: () => {
      if (env.isLiveMode) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.proactiveSuggestions() });
      }
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (env.isLiveMode) {
        await executeProactiveStream(id);
        return;
      }
      return undefined;
    },
    onSuccess: () => {
      if (env.isLiveMode) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.proactiveSuggestions() });
        void queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      }
    },
  });

  const suggestions = useMemo(() => {
    if (env.isLiveMode) {
      const items = liveQuery.data?.suggestions ?? [];
      return items.map((item) => mapApiToProactive(item, settings));
    }
    return getDemoProactiveSuggestions(settings);
  }, [liveQuery.data, settings]);

  const dismiss = useCallback(
    (id: string) => {
      if (!env.isLiveMode) dismissDemoSuggestion(id);
      dismissMutation.mutate(id);
    },
    [dismissMutation],
  );

  const snooze = useCallback(
    (id: string) => {
      if (!env.isLiveMode) snoozeDemoSuggestion(id);
      snoozeMutation.mutate(id);
    },
    [snoozeMutation],
  );

  return {
    suggestions,
    loading: env.isLiveMode && liveQuery.isLoading,
    error: env.isLiveMode ? liveQuery.error : null,
    dismiss,
    snooze,
    execute: (id: string) => executeMutation.mutate(id),
    executingId: executingProactiveId,
    streaming,
    liveExplain: streamLiveExplain,
    refresh: () => {
      if (env.isLiveMode) void liveQuery.refetch();
    },
  };
}
