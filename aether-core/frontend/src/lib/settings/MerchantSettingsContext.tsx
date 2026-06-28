import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsRepository } from '@/lib/data';
import { setLocale, t } from '../i18n';
import { showCalmToast } from '../toast';
import { queryKeys } from '../query/keys';
import { queryTiming } from '../query/client';
import { aetherErrorMessage, useAetherMutation } from '../query/hooks';
import { trackBusinessEvent, trackMutationFailure } from '@/lib/observability/businessEvents';
import { optimisticPatch, rollbackQueryData, type OptimisticContext } from '../query/optimistic';
import {
  DEFAULT_MERCHANT_SETTINGS,
  type MerchantSettings,
  type NotificationPrefs,
} from './merchantSettingsTypes';

interface MerchantSettingsContextValue {
  settings: MerchantSettings;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  updateSettings: (patch: Partial<MerchantSettings>) => Promise<void>;
  updateNotificationPrefs: (patch: Partial<NotificationPrefs>) => Promise<void>;
}

const MerchantSettingsContext = createContext<MerchantSettingsContextValue | null>(null);

export function MerchantSettingsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const {
    data: settings = DEFAULT_MERCHANT_SETTINGS,
    error,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: queryKeys.settings(),
    queryFn: async () => {
      const s = await settingsRepository.fetch();
      setLocale(s.locale);
      return s;
    },
    staleTime: queryTiming.settingsStale,
    gcTime: queryTiming.settingsGc,
    meta: { domain: 'settings' },
  });

  const updateMutation = useAetherMutation<
    MerchantSettings,
    Partial<MerchantSettings>,
    OptimisticContext<MerchantSettings>
  >({
    mutationFn: (patch: Partial<MerchantSettings>) => settingsRepository.update(patch),
    meta: { domain: 'settings', handled: true },
    showToastOnError: true,
    onMutate: async (patch) =>
      optimisticPatch(queryClient, queryKeys.settings(), (old) =>
        old ? { ...old, ...patch } : { ...DEFAULT_MERCHANT_SETTINGS, ...patch },
      ),
    onSuccess: (updated, patch) => {
      trackBusinessEvent('settings.updated', { keys: Object.keys(patch).join(',') });
      queryClient.setQueryData(queryKeys.settings(), updated);
      if (patch.locale) setLocale(updated.locale);
      showCalmToast({ variant: 'success', title: t('settings.saved') });
    },
    onError: (err, _patch, context) => {
      trackMutationFailure('settings', err);
      rollbackQueryData(queryClient, queryKeys.settings(), context);
    },
  });

  const reload = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const updateSettings = useCallback(
    async (patch: Partial<MerchantSettings>) => {
      await updateMutation.mutateAsync(patch);
    },
    [updateMutation],
  );

  const updateNotificationPrefs = useCallback(
    async (patch: Partial<NotificationPrefs>) => {
      await updateSettings({
        notificationPrefs: { ...settings.notificationPrefs, ...patch },
      });
    },
    [settings.notificationPrefs, updateSettings],
  );

  const errorMessage = aetherErrorMessage(error);

  const value = useMemo(
    () => ({
      settings,
      loading,
      error: errorMessage,
      reload,
      updateSettings,
      updateNotificationPrefs,
    }),
    [settings, loading, errorMessage, reload, updateSettings, updateNotificationPrefs],
  );

  return (
    <MerchantSettingsContext.Provider value={value}>{children}</MerchantSettingsContext.Provider>
  );
}

export function useMerchantSettings(): MerchantSettingsContextValue {
  const ctx = useContext(MerchantSettingsContext);
  if (!ctx) {
    throw new Error('useMerchantSettings must be used within MerchantSettingsProvider');
  }
  return ctx;
}

export function useMerchantSettingsOptional(): MerchantSettingsContextValue | null {
  return useContext(MerchantSettingsContext);
}
