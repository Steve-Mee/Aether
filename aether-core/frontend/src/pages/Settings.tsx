import React from 'react';
import { apiFetch, OperatingMetrics } from '../lib/api';
import { t } from '../lib/i18n';
import ApprovalPolicyPanel from '../components/ApprovalPolicyPanel';
import TruthReviewPanel from '../components/settings/TruthReviewPanel';
import AsyncBoundary from '../components/ui/AsyncBoundary';
import { useAsyncData } from '../lib/useAsyncData';

export default function Settings() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:9000';
  const tenantRaw = import.meta.env.VITE_AETHER_TENANT || '';
  const tenant = tenantRaw ? `${tenantRaw.slice(0, 8)}…` : '—';
  const { data: metrics, error: metricsError, loading, reload } = useAsyncData(() =>
    apiFetch<OperatingMetrics>('/api/admin/operating-metrics')
  );

  return (
    <div>
      <h1 className="text-4xl font-semibold tracking-tight mb-8 text-[var(--color-text)]">{t('nav.settings')}</h1>

      <div className="max-w-2xl space-y-6">
        <ApprovalPolicyPanel />
        {metrics && <TruthReviewPanel metrics={metrics} onComplete={reload} />}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-xl)] p-8">
          <h3 className="font-semibold text-xl mb-6 text-[var(--color-text)]">{t('settings.connection')}</h3>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-[var(--color-text-subtle)]">{t('settings.apiUrl')}</dt>
              <dd className="text-[var(--color-text)] font-mono">{apiUrl}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-subtle)]">{t('settings.tenant')}</dt>
              <dd className="text-[var(--color-text)] font-mono">{tenant}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-subtle)]">{t('settings.auth')}</dt>
              <dd className="text-[var(--color-text-muted)]">{t('settings.authHint')}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-xl)] p-8">
          <h3 className="font-semibold text-xl mb-4 text-[var(--color-text)]">{t('settings.operating')}</h3>
          <AsyncBoundary loading={loading} error={metricsError} onRetry={reload}>
            {metrics && (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-subtle)]">{t('settings.tenantSafety')}</dt>
                  <dd className="text-[var(--color-text)]">{(metrics.tenantSafetyScore * 100).toFixed(0)}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-subtle)]">{t('settings.gatePass')}</dt>
                  <dd className="text-[var(--color-text)]">{(metrics.gatePassRate * 100).toFixed(0)}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-subtle)]">{t('settings.autonomyRate')}</dt>
                  <dd className="text-[var(--color-text)]">{(metrics.autonomyRate * 100).toFixed(0)}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-subtle)]">{t('settings.autonomyIncident')}</dt>
                  <dd className="text-[var(--color-text)]">{(metrics.autonomyIncidentRate * 100).toFixed(1)}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-subtle)]">{t('settings.causalUplift')}</dt>
                  <dd className="text-[var(--color-text)]">€{metrics.causalUpliftVerified.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-subtle)]">{t('settings.rollback')}</dt>
                  <dd className="text-[var(--color-text)]">{(metrics.rollbackSuccessRate * 100).toFixed(0)}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-subtle)]">{t('settings.truthReview')}</dt>
                  <dd className={metrics.truthReviewDue ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'}>
                    {metrics.truthReviewDue ? t('settings.truthReview.yes') : t('settings.truthReview.no')}
                  </dd>
                </div>
                {metrics.killFastCandidates.length > 0 && (
                  <div>
                    <dt className="text-[var(--color-text-subtle)] mb-1">{t('settings.killFast')}</dt>
                    <dd className="text-[var(--color-text-muted)] text-xs font-mono">
                      {metrics.killFastCandidates.join(', ')}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </AsyncBoundary>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-[var(--radius-xl)] p-8">
          <h3 className="font-semibold text-xl mb-4 text-[var(--color-text)]">{t('settings.statusLegend')}</h3>
          <ul className="space-y-2 text-sm text-[var(--color-text-muted)]">
            <li>
              <span className="text-[var(--color-success)]">{t('status.live')}</span> — actief in productie met API + persistentie
            </li>
            <li>
              <span className="text-[var(--color-warning)]">{t('status.partial')}</span> — werkend met bekende beperkingen
            </li>
            <li>
              <span className="text-[var(--color-intent)]">{t('status.experimental')}</span> — sandbox, niet productie-klaar
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
