import { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, SettingRow, TextField } from '@/components/ui';
import { useCurrentUser } from '@/lib/auth/AuthProvider';
import { roleMeetsMin } from '@/lib/auth/permissions';
import {
  useAcceptBilateralContractMutation,
  useBilateralContractsQuery,
  useBilateralPackagesQuery,
  useBilateralSchemasQuery,
  useConsumeBilateralPackageMutation,
  useProposeBilateralContractMutation,
  usePublishBilateralPackageMutation,
  useRevokeBilateralContractMutation,
} from '@/lib/api/useBilateralExchangeQuery';
import { displayContractStatus, type BilateralContractDto } from '@/lib/bilateral/types';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import { t } from '@/lib/i18n';
import { showCalmToast } from '@/lib/toast';

function ContractPackages({
  contract,
  canManage,
}: {
  contract: BilateralContractDto;
  canManage: boolean;
}) {
  const enabled = contract.status === 'active' && contract.role === 'consumer';
  const { data, isLoading } = useBilateralPackagesQuery(contract.id, enabled);
  const consumeMutation = useConsumeBilateralPackageMutation();
  const packages = data?.packages ?? [];

  if (!enabled) return null;
  if (isLoading) {
    return <p className="text-xs text-muted-foreground mt-2">{t('common.loading')}</p>;
  }
  if (packages.length === 0) {
    return <p className="text-xs text-muted-foreground mt-2">{t('settings.bilateral.noPackages')}</p>;
  }

  return (
    <ul className="mt-2 space-y-2">
      {packages.map((pkg) => (
        <li
          key={pkg.id}
          className="flex flex-wrap items-center justify-between gap-2 text-xs border border-border/30 rounded p-2"
        >
          <span>
            {pkg.fieldCount} {t('settings.bilateral.fields')} · {new Date(pkg.expiresAt).toLocaleDateString()}
          </span>
          {canManage && !pkg.expired && (
            <Button
              variant="secondary"
              size="sm"
              disabled={consumeMutation.isPending}
              onClick={() =>
                void consumeMutation
                  .mutateAsync({ packageId: pkg.id, contractId: contract.id })
                  .then(() => showCalmToast({ title: t('settings.bilateral.consumeDone') }))
                  .catch((err: Error) =>
                    showCalmToast({ title: err.message || t('settings.bilateral.errorGeneric') })
                  )
              }
            >
              {t('settings.bilateral.consume')}
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

function ContractRow({
  contract,
  canManage,
  onMutate,
}: {
  contract: BilateralContractDto;
  canManage: boolean;
  onMutate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const acceptMutation = useAcceptBilateralContractMutation();
  const revokeMutation = useRevokeBilateralContractMutation();
  const publishMutation = usePublishBilateralPackageMutation();

  const status = displayContractStatus(contract);
  const statusKey = `settings.bilateral.status.${status}` as const;

  const runAction = async (action: () => Promise<unknown>, successKey: string) => {
    try {
      await action();
      showCalmToast({ title: t(successKey) });
      onMutate();
    } catch (err) {
      showCalmToast({
        title: err instanceof Error ? err.message : t('settings.bilateral.errorGeneric'),
      });
    }
  };

  return (
    <div className="py-4 border-b border-border/30" data-testid={`bilateral-contract-${contract.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-medium text-foreground">
            {contract.partnerName}
            {contract.partnerSlug ? ` (${contract.partnerSlug})` : ''}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {contract.schemaKey} · {t(`settings.bilateral.role.${contract.role}`)} ·{' '}
            {t(statusKey)}
          </div>
          {contract.ttlExpiresAt && (
            <div className="text-xs text-muted-foreground">
              TTL: {new Date(contract.ttlExpiresAt).toLocaleString()}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? t('settings.bilateral.hideDetails') : t('settings.bilateral.showDetails')}
          </Button>
          {canManage && contract.role === 'consumer' && status === 'pending' && (
            <Button
              variant="primary"
              size="sm"
              disabled={acceptMutation.isPending}
              onClick={() =>
                void runAction(
                  () => acceptMutation.mutateAsync(contract.id),
                  'settings.bilateral.acceptDone'
                )
              }
            >
              {t('settings.bilateral.accept')}
            </Button>
          )}
          {canManage && status === 'active' && contract.role === 'provider' && (
            <Button
              variant="primary"
              size="sm"
              disabled={publishMutation.isPending}
              onClick={() =>
                void runAction(
                  () => publishMutation.mutateAsync(contract.id),
                  'settings.bilateral.publishDone'
                )
              }
            >
              {t('settings.bilateral.publish')}
            </Button>
          )}
          {canManage && status !== 'revoked' && (
            <Button
              variant="secondary"
              size="sm"
              disabled={revokeMutation.isPending}
              onClick={() => {
                if (!window.confirm(t('settings.bilateral.revokeConfirm'))) return;
                void runAction(
                  () => revokeMutation.mutateAsync(contract.id),
                  'settings.bilateral.revokeDone'
                );
              }}
            >
              {t('settings.bilateral.revoke')}
            </Button>
          )}
        </div>
      </div>
      {expanded && (
        <div className="mt-3 text-xs text-muted-foreground">
          <p>{contract.schemaDescription}</p>
          <p className="mt-1">
            {t('settings.bilateral.allowedFields')}: {contract.allowedFields.join(', ')}
          </p>
          <ContractPackages contract={contract} canManage={canManage} />
        </div>
      )}
    </div>
  );
}

export default function BilateralExchangePanel() {
  const { settings } = useMerchantSettings();
  const user = useCurrentUser();
  const canManage = roleMeetsMin(user?.role ?? 'viewer', 'operator');
  const enabled = settings.brainBilateralExchangeEnabled === true;

  const { data: contractsData, isLoading, refetch } = useBilateralContractsQuery(enabled);
  const { data: schemasData } = useBilateralSchemasQuery(enabled && canManage);

  const [formOpen, setFormOpen] = useState(false);
  const [partnerSlug, setPartnerSlug] = useState('');
  const [schemaKey, setSchemaKey] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [ttlExpiresAt, setTtlExpiresAt] = useState('');
  const proposeId = useId();

  const proposeMutation = useProposeBilateralContractMutation();

  const schemas = (schemasData?.schemas ?? []).map((s) => ({
    ...s,
    fields: Array.isArray(s.fields) ? (s.fields as string[]) : [],
  }));
  const selectedSchema = useMemo(
    () => schemas.find((s) => s.schemaKey === schemaKey),
    [schemas, schemaKey]
  );

  useEffect(() => {
    if (selectedSchema) {
      setSelectedFields([...selectedSchema.fields]);
    } else {
      setSelectedFields([]);
    }
  }, [selectedSchema]);

  const contracts = contractsData?.contracts ?? [];
  const pendingIncoming = contracts.filter(
    (c) => c.role === 'consumer' && displayContractStatus(c) === 'pending'
  );

  if (!enabled) {
    return (
      <Card variant="elevated" padding="lg" data-testid="bilateral-exchange-panel">
        <h2 className="text-title font-semibold text-foreground mb-2">
          {t('settings.section.bilateralExchange')}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">{t('settings.bilateral.disabledHint')}</p>
        <Link to="/settings?section=privacy" className="text-sm text-primary underline">
          {t('settings.bilateral.enableInPrivacy')}
        </Link>
      </Card>
    );
  }

  const submitPropose = async () => {
    if (!partnerSlug.trim() || !schemaKey || selectedFields.length === 0) return;
    if (!window.confirm(t('settings.bilateral.proposeConfirm').replace('{slug}', partnerSlug.trim()))) {
      return;
    }
    try {
      await proposeMutation.mutateAsync({
        consumerTenantSlug: partnerSlug.trim(),
        schemaKey,
        allowedFields: selectedFields,
        ttlExpiresAt: ttlExpiresAt ? new Date(ttlExpiresAt).toISOString() : undefined,
      });
      showCalmToast({ title: t('settings.bilateral.proposeDone') });
      setPartnerSlug('');
      setSchemaKey('');
      setTtlExpiresAt('');
      setFormOpen(false);
      void refetch();
    } catch (err) {
      showCalmToast({
        title: err instanceof Error ? err.message : t('settings.bilateral.errorGeneric'),
      });
    }
  };

  return (
    <Card variant="elevated" padding="lg" data-testid="bilateral-exchange-panel">
      <h2 className="text-title font-semibold text-foreground mb-2">
        {t('settings.section.bilateralExchange')}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">{t('settings.bilateral.subtitle')}</p>

      {pendingIncoming.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm font-medium text-foreground mb-1">
            {t('settings.bilateral.pendingIncoming')}
          </p>
          <p className="text-xs text-muted-foreground">
            {pendingIncoming.length} {t('settings.bilateral.pendingCount')}
          </p>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : contracts.length === 0 ? (
        <p className="text-sm text-muted-foreground mb-6">{t('settings.bilateral.empty')}</p>
      ) : (
        <div className="mb-6">
          {contracts.map((contract) => (
            <ContractRow
              key={contract.id}
              contract={contract}
              canManage={canManage}
              onMutate={() => void refetch()}
            />
          ))}
        </div>
      )}

      {canManage && (
        <div>
          <Button variant="secondary" size="sm" onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? t('settings.bilateral.hidePropose') : t('settings.bilateral.propose')}
          </Button>

          {formOpen && (
            <div className="mt-4 space-y-4 max-w-lg" id={proposeId}>
              <SettingRow label={t('settings.bilateral.partnerSlug')}>
                <TextField
                  value={partnerSlug}
                  onChange={(e) => setPartnerSlug(e.target.value)}
                  placeholder="partner-shop"
                />
              </SettingRow>

              <SettingRow label={t('settings.bilateral.schema')}>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={schemaKey}
                  onChange={(e) => setSchemaKey(e.target.value)}
                >
                  <option value="">{t('settings.bilateral.selectSchema')}</option>
                  {schemas.map((schema) => (
                    <option key={schema.id} value={schema.schemaKey}>
                      {schema.schemaKey}
                    </option>
                  ))}
                </select>
              </SettingRow>

              {selectedSchema && (
                <SettingRow label={t('settings.bilateral.allowedFields')}>
                  <div className="space-y-2">
                    {selectedSchema.fields.map((field) => (
                      <label key={field} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedFields.includes(field)}
                          onChange={(e) => {
                            setSelectedFields((prev) =>
                              e.target.checked
                                ? [...prev, field]
                                : prev.filter((f) => f !== field)
                            );
                          }}
                        />
                        {field}
                      </label>
                    ))}
                  </div>
                </SettingRow>
              )}

              <SettingRow label={t('settings.bilateral.ttlOptional')}>
                <TextField
                  type="datetime-local"
                  value={ttlExpiresAt}
                  onChange={(e) => setTtlExpiresAt(e.target.value)}
                />
              </SettingRow>

              <Button
                variant="primary"
                size="sm"
                disabled={
                  !partnerSlug.trim() ||
                  !schemaKey ||
                  selectedFields.length === 0 ||
                  proposeMutation.isPending
                }
                onClick={() => void submitPropose()}
              >
                {t('settings.bilateral.submitPropose')}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
