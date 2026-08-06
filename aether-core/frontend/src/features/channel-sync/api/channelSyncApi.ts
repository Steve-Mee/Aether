import { apiFetch, apiRoutes } from '@/lib/api';

export type ChannelProvider = 'shopify' | 'woocommerce';

export interface ChannelConnectionDto {
  id: string;
  tenantId: string;
  provider: ChannelProvider;
  displayName: string;
  storeUrl: string;
  enabled: boolean;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  config: {
    provider: ChannelProvider;
    storeUrl: string;
    syncOptions?: {
      syncProducts?: boolean;
      syncOrders?: boolean;
      syncInventory?: boolean;
    };
  };
}

export interface ChannelSyncSettingsDto {
  tenantEnabled: boolean;
  envOverride: boolean | null;
  effectiveEnabled: boolean;
}

export interface SyncResultDto {
  connectionId: string;
  productsSynced: number;
  ordersSynced: number;
  status: 'success' | 'partial' | 'failed';
  errors: string[];
  syncedAt: string;
}

export const channelSyncApi = {
  fetchSettings: () => apiFetch<ChannelSyncSettingsDto>(apiRoutes.channelSync.settings),

  updateSettings: (enabled: boolean) =>
    apiFetch<ChannelSyncSettingsDto>(apiRoutes.channelSync.settings, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    }),

  listConnections: () =>
    apiFetch<{ connections: ChannelConnectionDto[] }>(apiRoutes.channelSync.connections),

  createConnection: (body: {
    provider: ChannelProvider;
    displayName: string;
    config: {
      provider: ChannelProvider;
      storeUrl: string;
      credentials: Record<string, string>;
      syncOptions?: { syncProducts?: boolean; syncOrders?: boolean; syncInventory?: boolean };
    };
  }) =>
    apiFetch<{ connection: ChannelConnectionDto }>(apiRoutes.channelSync.connections, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  deleteConnection: (id: string) =>
    apiFetch<void>(apiRoutes.channelSync.connection(id), { method: 'DELETE' }),

  testConnection: (id: string) =>
    apiFetch<{ connected: boolean; error?: string }>(apiRoutes.channelSync.test(id), {
      method: 'POST',
    }),

  syncConnection: (id: string) =>
    apiFetch<{ sync: SyncResultDto }>(apiRoutes.channelSync.sync(id), { method: 'POST' }),

  getOAuthUrl: (id: string, redirectUri: string) =>
    apiFetch<{ url: string }>(apiRoutes.channelSync.oauthUrl(id, redirectUri)),

  completeOAuth: (id: string, code: string, redirectUri: string) =>
    apiFetch<{ connection: ChannelConnectionDto; connected: boolean }>(
      apiRoutes.channelSync.oauthCallback(id),
      {
        method: 'POST',
        body: JSON.stringify({ code, redirectUri }),
      }
    ),
};
