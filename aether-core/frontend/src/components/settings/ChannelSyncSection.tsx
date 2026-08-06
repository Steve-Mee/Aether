import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link2, RefreshCw, Store, Trash2 } from 'lucide-react';
import {
  channelSyncApi,
  type ChannelConnectionDto,
  type ChannelProvider,
} from '@/features/channel-sync/api/channelSyncApi';
import { t } from '@/lib/i18n';
import { showCalmToast } from '@/lib/toast';
import { AsyncBoundary, Badge, Button, Card, SettingRow } from '@/components/ui';
import { SettingsSectionSkeleton } from '@/components/ui/skeletons/SettingsSectionSkeleton';
import { queryKeys } from '@/lib/query/keys';
import { aetherErrorMessage } from '@/lib/query/hooks';

const OAUTH_REDIRECT =
  typeof window !== 'undefined'
    ? `${window.location.origin}/settings?section=services`
    : 'http://localhost:5173/settings?section=services';

function statusVariant(status?: string): 'default' | 'success' | 'warning' {
  if (status === 'success') return 'success';
  if (status === 'partial') return 'warning';
  return 'default';
}

function ConnectionRow({
  connection,
  onSync,
  onTest,
  onDelete,
  onOAuth,
  busy,
}: {
  connection: ChannelConnectionDto;
  onSync: (id: string) => void;
  onTest: (id: string) => void;
  onDelete: (id: string) => void;
  onOAuth: (id: string) => void;
  busy: boolean;
}) {
  return (
    <li className="flex flex-col gap-3 p-4 rounded-aether border border-border/30 bg-background/40">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body font-medium text-foreground">{connection.displayName}</p>
          <p className="text-caption text-muted-foreground mt-0.5">
            {connection.provider} · {connection.storeUrl}
          </p>
          <p className="text-caption text-muted-foreground mt-1">
            {t('settings.channelSync.lastSync')}:{' '}
            {connection.lastSyncAt
              ? new Date(connection.lastSyncAt).toLocaleString()
              : t('settings.services.never')}
            {connection.lastSyncStatus ? (
              <>
                {' '}
                ·{' '}
                <Badge variant={statusVariant(connection.lastSyncStatus)}>
                  {connection.lastSyncStatus}
                </Badge>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {connection.provider === 'shopify' && (
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => onOAuth(connection.id)}
            >
              {t('settings.channelSync.oauth')}
            </Button>
          )}
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => onTest(connection.id)}>
            {t('settings.channelSync.test')}
          </Button>
          <Button variant="primary" size="sm" disabled={busy} onClick={() => onSync(connection.id)}>
            <RefreshCw size={14} className="mr-1" aria-hidden />
            {t('settings.channelSync.sync')}
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => onDelete(connection.id)}>
            <Trash2 size={14} aria-hidden />
          </Button>
        </div>
      </div>
    </li>
  );
}

export default function ChannelSyncSection() {
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState<ChannelProvider>('shopify');
  const [displayName, setDisplayName] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  const settingsQuery = useQuery({
    queryKey: queryKeys.channelSyncSettings(),
    queryFn: () => channelSyncApi.fetchSettings(),
    meta: { domain: 'settings' },
  });

  const connectionsQuery = useQuery({
    queryKey: queryKeys.channelConnections(),
    queryFn: async () => {
      const res = await channelSyncApi.listConnections();
      return res.connections;
    },
    enabled: settingsQuery.data?.effectiveEnabled === true,
    meta: { domain: 'settings' },
  });

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => channelSyncApi.updateSettings(enabled),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.channelSyncSettings() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.channelConnections() });
    },
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const credentials =
        provider === 'shopify'
          ? { accessToken: accessToken.trim() }
          : { apiKey: apiKey.trim(), apiSecret: apiSecret.trim() };

      return channelSyncApi.createConnection({
        provider,
        displayName: displayName.trim(),
        config: {
          provider,
          storeUrl: storeUrl.trim(),
          credentials,
          syncOptions: { syncProducts: true, syncOrders: true },
        },
      });
    },
    onSuccess: () => {
      setDisplayName('');
      setStoreUrl('');
      setAccessToken('');
      setApiKey('');
      setApiSecret('');
      void queryClient.invalidateQueries({ queryKey: queryKeys.channelConnections() });
      showCalmToast({ title: t('settings.channelSync.created') });
    },
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => channelSyncApi.syncConnection(id),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.channelConnections() });
      const sync = data.sync;
      showCalmToast({
        title: t('settings.channelSync.syncDone'),
        description: `${sync.productsSynced} products, ${sync.ordersSynced} orders (${sync.status})`,
      });
      if (sync.errors.length) {
        showCalmToast({ title: sync.errors.slice(0, 2).join('; ') });
      }
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => channelSyncApi.testConnection(id),
    onSuccess: (result) => {
      showCalmToast({
        title: result.connected
          ? t('settings.channelSync.testOk')
          : result.error ?? t('settings.channelSync.testFail'),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => channelSyncApi.deleteConnection(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.channelConnections() });
    },
  });

  const oauthMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const { url } = await channelSyncApi.getOAuthUrl(connectionId, OAUTH_REDIRECT);
      window.location.href = url;
      return connectionId;
    },
  });

  const completeOAuth = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const connectionId = sessionStorage.getItem('channelSyncOAuthConnectionId');
    if (!code || !connectionId) return;

    try {
      await channelSyncApi.completeOAuth(connectionId, code, OAUTH_REDIRECT);
      sessionStorage.removeItem('channelSyncOAuthConnectionId');
      params.delete('code');
      params.delete('state');
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.channelConnections() });
      showCalmToast({ title: t('settings.channelSync.oauthDone') });
    } catch (err) {
      showCalmToast({ title: aetherErrorMessage(err) });
    }
  }, [queryClient]);

  useEffect(() => {
    void completeOAuth();
  }, [completeOAuth]);

  const envLocked = settingsQuery.data?.envOverride !== null;
  const enabled = settingsQuery.data?.effectiveEnabled === true;
  const busy =
    toggleMutation.isPending ||
    createMutation.isPending ||
    syncMutation.isPending ||
    testMutation.isPending ||
    deleteMutation.isPending ||
    oauthMutation.isPending;

  const connections = connectionsQuery.data ?? [];

  const canCreate = useMemo(() => {
    if (!displayName.trim() || !storeUrl.trim()) return false;
    if (provider === 'shopify') return accessToken.trim().length > 0;
    return apiKey.trim().length > 0 && apiSecret.trim().length > 0;
  }, [displayName, storeUrl, provider, accessToken, apiKey, apiSecret]);

  const handleOAuth = (connectionId: string) => {
    sessionStorage.setItem('channelSyncOAuthConnectionId', connectionId);
    oauthMutation.mutate(connectionId);
  };

  return (
    <Card variant="elevated" padding="lg" data-testid="settings-channel-sync">
      <div className="flex items-center gap-2 mb-6">
        <Store size={18} className="text-muted-foreground" aria-hidden />
        <h2 className="text-title font-semibold text-foreground">{t('settings.channelSync.title')}</h2>
      </div>

      <AsyncBoundary
        loading={settingsQuery.isLoading}
        error={aetherErrorMessage(settingsQuery.error)}
        onRetry={() => void settingsQuery.refetch()}
        skeleton={<SettingsSectionSkeleton />}
      >
        <SettingRow
          label={t('settings.channelSync.enable')}
          description={
            envLocked
              ? t('settings.channelSync.envOverride')
              : t('settings.channelSync.enableHint')
          }
        >
          <Button
            variant={settingsQuery.data?.tenantEnabled ? 'primary' : 'secondary'}
            size="sm"
            disabled={envLocked || toggleMutation.isPending}
            onClick={() =>
              toggleMutation.mutate(!settingsQuery.data?.tenantEnabled)
            }
          >
            {settingsQuery.data?.tenantEnabled
              ? t('settings.channelSync.enabled')
              : t('settings.channelSync.disabled')}
          </Button>
        </SettingRow>

        {!enabled && (
          <p className="text-caption text-muted-foreground mt-4">{t('settings.channelSync.gated')}</p>
        )}

        {enabled && (
          <div className="mt-8 space-y-6">
            <div>
              <h3 className="text-body font-medium mb-3">{t('settings.channelSync.addConnection')}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-caption">
                  {t('settings.channelSync.provider')}
                  <select
                    className="mt-1 w-full rounded-aether border border-border/40 bg-background px-3 py-2 text-body"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as ChannelProvider)}
                  >
                    <option value="shopify">Shopify</option>
                    <option value="woocommerce">WooCommerce</option>
                  </select>
                </label>
                <label className="text-caption">
                  {t('settings.channelSync.displayName')}
                  <input
                    className="mt-1 w-full rounded-aether border border-border/40 bg-background px-3 py-2 text-body"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="My webshop"
                  />
                </label>
                <label className="text-caption sm:col-span-2">
                  {t('settings.channelSync.storeUrl')}
                  <input
                    className="mt-1 w-full rounded-aether border border-border/40 bg-background px-3 py-2 text-body"
                    value={storeUrl}
                    onChange={(e) => setStoreUrl(e.target.value)}
                    placeholder={
                      provider === 'shopify'
                        ? 'https://your-store.myshopify.com'
                        : 'https://your-store.com'
                    }
                  />
                </label>
                {provider === 'shopify' ? (
                  <label className="text-caption sm:col-span-2">
                    {t('settings.channelSync.accessToken')}
                    <input
                      type="password"
                      className="mt-1 w-full rounded-aether border border-border/40 bg-background px-3 py-2 text-body"
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                    />
                  </label>
                ) : (
                  <>
                    <label className="text-caption">
                      API Key
                      <input
                        className="mt-1 w-full rounded-aether border border-border/40 bg-background px-3 py-2 text-body"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                    </label>
                    <label className="text-caption">
                      API Secret
                      <input
                        type="password"
                        className="mt-1 w-full rounded-aether border border-border/40 bg-background px-3 py-2 text-body"
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                      />
                    </label>
                  </>
                )}
              </div>
              <Button
                className="mt-4"
                variant="secondary"
                size="sm"
                disabled={!canCreate || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                <Link2 size={14} className="mr-1" aria-hidden />
                {t('settings.channelSync.create')}
              </Button>
            </div>

            <AsyncBoundary
              loading={connectionsQuery.isLoading}
              error={aetherErrorMessage(connectionsQuery.error)}
              onRetry={() => void connectionsQuery.refetch()}
              skeleton={<SettingsSectionSkeleton />}
            >
              {connections.length === 0 ? (
                <p className="text-caption text-muted-foreground">{t('settings.channelSync.empty')}</p>
              ) : (
                <ul className="space-y-3">
                  {connections.map((c) => (
                    <ConnectionRow
                      key={c.id}
                      connection={c}
                      busy={busy}
                      onSync={(id) => syncMutation.mutate(id)}
                      onTest={(id) => testMutation.mutate(id)}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      onOAuth={handleOAuth}
                    />
                  ))}
                </ul>
              )}
            </AsyncBoundary>
          </div>
        )}
      </AsyncBoundary>
    </Card>
  );
}
