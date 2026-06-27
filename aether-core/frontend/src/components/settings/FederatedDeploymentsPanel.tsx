import { useEffect, useState } from 'react';
import { TextField, Button, Card, SettingRow } from '@/components/ui';
import { t } from '@/lib/i18n';
import {
  useCreateFederatedDeploymentMutation,
  useDeactivateFederatedDeploymentMutation,
  useFederatedDeploymentsQuery,
  useFederatedStatusQuery,
  useUpdateFederatedDeploymentMutation,
} from '@/lib/api/useFederatedDeploymentsQuery';

export default function FederatedDeploymentsPanel() {
  const { data, isLoading, refetch } = useFederatedDeploymentsQuery();
  const { data: status } = useFederatedStatusQuery();
  const createMutation = useCreateFederatedDeploymentMutation();
  const updateMutation = useUpdateFederatedDeploymentMutation();
  const deactivateMutation = useDeactivateFederatedDeploymentMutation();

  const [deploymentId, setDeploymentId] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [capabilities, setCapabilities] = useState('inventory-trends');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const deployments = data?.deployments ?? [];

  const submitCreate = async () => {
    setBusy(true);
    try {
      await createMutation.mutateAsync({
        deploymentId,
        baseUrl: baseUrl || undefined,
        capabilities: capabilities.split(',').map((c) => c.trim()).filter(Boolean),
        status: 'active',
      });
      setDeploymentId('');
      setBaseUrl('');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (dep: (typeof deployments)[0]) => {
    if (dep.source === 'env') return;
    setBusy(true);
    try {
      if (dep.status === 'active') {
        await deactivateMutation.mutateAsync(dep.deploymentId);
      } else {
        await updateMutation.mutateAsync({
          deploymentId: dep.deploymentId,
          capabilities: dep.capabilities,
          status: 'active',
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="elevated" padding="lg" data-testid="federated-deployments-panel">
      <h2 className="text-title font-semibold text-foreground mb-2">
        {t('settings.platform.federatedTitle')}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">{t('settings.platform.federatedHint')}</p>

      {status && (
        <div className="text-sm text-muted-foreground mb-6 space-y-1">
          <div>{t('settings.platform.localDeployment')}: {status.localDeploymentId}</div>
          <div>{t('settings.platform.broker')}: {status.messageBroker}</div>
          <div>{t('settings.platform.rpcEnabled')}: {status.federatedRpcEnabled ? 'yes' : 'no'}</div>
          <div>{t('settings.platform.relayBacklog')}: {status.relayBacklog}</div>
        </div>
      )}

      <div className="space-y-3 mb-8">
        {isLoading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
        {deployments.map((dep) => (
          <div
            key={dep.deploymentId}
            className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-border/30"
          >
            <div>
              <div className="font-medium">{dep.deploymentId}</div>
              <div className="text-xs text-muted-foreground">
                {dep.capabilities.join(', ')} · {dep.source}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{dep.status}</span>
              {dep.source === 'env' ? (
                <span className="text-xs bg-muted px-2 py-1 rounded">{t('settings.platform.envReadOnly')}</span>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => void toggleActive(dep)}
                >
                  {dep.status === 'active' ? t('settings.platform.deactivate') : t('settings.platform.activate')}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <h3 className="text-sm font-semibold mb-4">{t('settings.platform.addDeployment')}</h3>
      <div className="space-y-4 max-w-md">
        <SettingRow label={t('settings.platform.deploymentId')}>
          <TextField value={deploymentId} onChange={(e) => setDeploymentId(e.target.value)} />
        </SettingRow>
        <SettingRow label={t('settings.platform.baseUrl')}>
          <TextField value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://..." />
        </SettingRow>
        <SettingRow label={t('settings.platform.capabilities')}>
          <TextField value={capabilities} onChange={(e) => setCapabilities(e.target.value)} />
        </SettingRow>
        <Button variant="primary" size="sm" disabled={!deploymentId || busy} onClick={() => void submitCreate()}>
          {t('settings.platform.create')}
        </Button>
      </div>
    </Card>
  );
}
