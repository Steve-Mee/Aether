import React, { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { Button, EmptyState, OutcomesPageSkeleton, SegmentedControl } from '@/components/ui';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { t } from '@/lib/i18n';
import { useOutcomesPage } from '@/hooks/useOutcomesPage';

export default function Outcomes() {
  const page = useOutcomesPage();

  const tabOptions = useMemo(
    () => [
      { value: 'outcomes' as const, label: t('outcomes.tab.outcomes') },
      { value: 'billing' as const, label: t('outcomes.tab.billing') },
    ],
    [],
  );

  return (
    <ModulePageLayout
      title={t('outcomes.title')}
      subtitle={t('outcomes.subtitle')}
      featureKey="outcomes"
      testId="outcomes-page"
      loading={page.loading}
      error={page.error}
      onRetry={page.reload}
      skeleton={<OutcomesPageSkeleton />}
    >
      <SegmentedControl
        options={tabOptions}
        value={page.tab}
        onChange={page.setTab}
        data-testid="outcomes-tab"
        aria-label={t('nav.outcomes')}
      />

      {page.tab === 'outcomes' && page.report && (
        <>
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <MetricCard label="Total records" value={String(page.report.totalRecords)} />
            <MetricCard
              label="Verified / billable"
              value={`${page.report.verifiedCount} / ${page.report.billableCount}`}
            />
            <MetricCard
              label="Billable uplift (€)"
              value={page.report.totalBillableUplift.toFixed(2)}
            />
          </div>

          {page.report.records.length === 0 ? (
            <EmptyState
              variant="premium"
              title={t('outcomes.empty.records')}
              description={t('outcomes.empty.recordsDesc')}
              icon={<BarChart3 size={32} />}
            />
          ) : (
            <div className="rounded-2xl border border-border/40 bg-card/30 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border/40">
                    <th className="text-left p-4 font-medium">Metric</th>
                    <th className="text-left p-4 font-medium">Baseline</th>
                    <th className="text-left p-4 font-medium">Observed</th>
                    <th className="text-left p-4 font-medium">Uplift</th>
                    <th className="text-left p-4 font-medium">Confidence</th>
                    <th className="text-left p-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {page.report.records.map((r) => (
                    <tr key={r.id} className="border-b border-border/40/50">
                      <td className="p-4">{r.metric}</td>
                      <td className="p-4 text-muted-foreground">{r.baseline.toFixed(2)}</td>
                      <td className="p-4 text-muted-foreground">{r.observed.toFixed(2)}</td>
                      <td className="p-4">{r.uplift.toFixed(1)}%</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 max-w-[120px]">
                          <div
                            className="h-1.5 flex-1 rounded-full bg-border/40"
                            role="presentation"
                          >
                            <div
                              className="h-full rounded-full bg-primary/80"
                              style={{
                                width: `${Math.min(100, Math.round(r.confidence * 100))}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {Math.round(r.confidence * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={
                            r.verificationStatus === 'billable'
                              ? 'text-success'
                              : r.verificationStatus === 'verified'
                                ? 'text-primary'
                                : 'text-muted-foreground'
                          }
                        >
                          {r.verificationStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {page.tab === 'billing' && page.billing && (
        <>
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <MetricCard label="Billing records" value={String(page.billing.totalRecords)} />
            <MetricCard label="Total fees (€)" value={page.billing.totalAmount.toFixed(2)} />
            <MetricCard label="Reconciled" value={String(page.billing.reconciledCount)} />
          </div>

          <Button
            variant="primary"
            size="sm"
            className="mb-6 transition-all duration-fast"
            onClick={() => void page.reconcile()}
            disabled={page.reconciling}
          >
            {page.reconciling ? t('outcomes.reconciling') : t('outcomes.reconcile')}
          </Button>

          {page.billing.records.length === 0 ? (
            <EmptyState
              variant="premium"
              title={t('outcomes.empty.billing')}
              description={t('outcomes.empty.billingDesc')}
              icon={<BarChart3 size={32} />}
            />
          ) : (
            <div className="rounded-2xl border border-border/40 bg-card/30 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border/40">
                    <th className="text-left p-4 font-medium">Outcome</th>
                    <th className="text-left p-4 font-medium">Amount</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {page.billing.records.map((r) => (
                    <tr key={r.id} className="border-b border-border/40/50">
                      <td className="p-4 font-mono text-xs">{r.outcomeId.slice(0, 12)}…</td>
                      <td className="p-4 tabular-nums">€{r.amount.toFixed(2)}</td>
                      <td className="p-4">{r.status}</td>
                      <td className="p-4 text-muted-foreground font-mono text-xs">
                        {r.stripeInvoiceId ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </ModulePageLayout>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl p-6 border border-border/40 bg-card/40">
      <div className="text-meta text-muted-foreground mb-1">{label}</div>
      <div className="text-display font-semibold tabular-nums">{value}</div>
    </div>
  );
}
