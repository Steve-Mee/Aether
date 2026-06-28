import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useOperatingMetricsQuery } from '@/features/settings/hooks/useOperatingMetricsQuery';
import { t } from '@/lib/i18n';
import { showCalmToast } from '@/lib/toast';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import TruthReviewPanel from './TruthReviewPanel';
import { AsyncBoundary, Button, Card, SettingRow, Switch } from '@/components/ui';
import { SettingsSectionSkeleton } from '@/components/ui/skeletons/SettingsSectionSkeleton';
import { getRuntimeConfig } from '@/lib/config';
import { cn } from '@/lib/utils';

export default function DataPrivacySection() {
  const { settings, updateSettings } = useMerchantSettings();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const advancedPanelId = useId();
  const exportToggleId = useId();
  const bilateralToggleId = useId();
  const { apiUrl, tenantId } = getRuntimeConfig();
  const tenant = tenantId ? `${tenantId.slice(0, 8)}…` : '—';

  const { data: metrics, error: metricsError, loading, reload } = useOperatingMetricsQuery();

  const handleExport = () => {
    showCalmToast({ title: t('settings.privacy.exportDone') });
  };

  return (
    <div className="space-y-6" data-testid="settings-privacy">
      <Card variant="elevated" padding="lg">
        <h2 className="text-title font-semibold text-foreground mb-6">
          {t('settings.section.privacy')}
        </h2>

        <SettingRow
          label={t('settings.privacy.dataExport')}
          description={t('settings.privacy.dataExportHint')}
          htmlFor={exportToggleId}
        >
          <Switch
            id={exportToggleId}
            checked={settings.dataExportEnabled}
            onCheckedChange={(v) => void updateSettings({ dataExportEnabled: v })}
          />
        </SettingRow>

        <SettingRow
          label={t('settings.privacy.bilateralExchange')}
          description={t('settings.privacy.bilateralExchangeHint')}
          htmlFor={bilateralToggleId}
        >
          <Switch
            id={bilateralToggleId}
            checked={settings.brainBilateralExchangeEnabled}
            onCheckedChange={(v) => void updateSettings({ brainBilateralExchangeEnabled: v })}
            data-testid="brain-bilateral-exchange"
          />
        </SettingRow>

        <SettingRow
          label={t('settings.privacy.export')}
          description={t('settings.privacy.exportHint')}
        >
          <Button
            variant="secondary"
            size="sm"
            disabled={!settings.dataExportEnabled}
            onClick={handleExport}
          >
            {t('settings.privacy.exportAction')}
          </Button>
        </SettingRow>
      </Card>

      <Card variant="elevated" padding="lg">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setAdvancedOpen((o) => !o)}
          aria-expanded={advancedOpen}
          aria-controls={advancedPanelId}
          data-testid="settings-privacy-advanced-toggle"
        >
          <div>
            <h3 className="text-title font-semibold text-foreground">
              {t('settings.privacy.advanced')}
            </h3>
            <p className="text-meta text-muted-foreground mt-1">
              {t('settings.privacy.advancedHint')}
            </p>
          </div>
          <ChevronDown
            size={18}
            className={cn(
              'text-muted-foreground transition-transform',
              advancedOpen && 'rotate-180',
            )}
            aria-hidden
          />
        </button>

        {advancedOpen && (
          <div id={advancedPanelId} className="mt-6 space-y-6 border-t border-border/30 pt-6">
            {metrics && <TruthReviewPanel metrics={metrics} onComplete={reload} />}

            <div>
              <h4 className="text-body font-medium text-foreground mb-4">
                {t('settings.connection')}
              </h4>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">{t('settings.apiUrl')}</dt>
                  <dd className="text-foreground font-mono">{apiUrl}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('settings.tenant')}</dt>
                  <dd className="text-foreground font-mono">{tenant}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('settings.auth')}</dt>
                  <dd className="text-muted-foreground">{t('settings.authHint')}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h4 className="text-body font-medium text-foreground mb-4">
                {t('settings.operating')}
              </h4>
              <AsyncBoundary
                loading={loading}
                error={metricsError}
                onRetry={reload}
                skeleton={<SettingsSectionSkeleton />}
              >
                {metrics && (
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{t('settings.tenantSafety')}</dt>
                      <dd className="text-foreground">
                        {(metrics.tenantSafetyScore * 100).toFixed(0)}%
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{t('settings.gatePass')}</dt>
                      <dd className="text-foreground">
                        {(metrics.gatePassRate * 100).toFixed(0)}%
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{t('settings.autonomyRate')}</dt>
                      <dd className="text-foreground">
                        {(metrics.autonomyRate * 100).toFixed(0)}%
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{t('settings.autonomyIncident')}</dt>
                      <dd className="text-foreground">
                        {(metrics.autonomyIncidentRate * 100).toFixed(1)}%
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{t('settings.causalUplift')}</dt>
                      <dd className="text-foreground">
                        €{metrics.causalUpliftVerified.toFixed(2)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{t('settings.rollback')}</dt>
                      <dd className="text-foreground">
                        {(metrics.rollbackSuccessRate * 100).toFixed(0)}%
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{t('settings.truthReview')}</dt>
                      <dd className={metrics.truthReviewDue ? 'text-warning' : 'text-success'}>
                        {metrics.truthReviewDue
                          ? t('settings.truthReview.yes')
                          : t('settings.truthReview.no')}
                      </dd>
                    </div>
                  </dl>
                )}
              </AsyncBoundary>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
