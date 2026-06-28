import { getDataAdapter } from '../createDataAdapter';
import type { MerchantSettings } from '@/lib/settings/merchantSettingsTypes';

export const settingsRepository = {
  fetch: () => getDataAdapter().fetchSettings(),
  update: (patch: Partial<MerchantSettings>) => getDataAdapter().updateSettings(patch),
  connectedServices: () => getDataAdapter().fetchConnectedServices(),
  operatingMetrics: () => getDataAdapter().fetchOperatingMetrics(),
};
