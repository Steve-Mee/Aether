import React, { useEffect, useState } from 'react';
import { apiFetch, BillingSummary } from '../lib/api';
import FeatureStatusFromTruth from '../components/FeatureStatusFromTruth';

interface OutcomeRecord {
  id: string;
  metric: string;
  baseline: number;
  observed: number;
  uplift: number;
  confidence: number;
  verificationStatus: string;
  periodStart: string;
  periodEnd: string;
}

interface OutcomeReport {
  periodDays: number;
  totalRecords: number;
  verifiedCount: number;
  billableCount: number;
  totalBillableUplift: number;
  records: OutcomeRecord[];
}

type Tab = 'outcomes' | 'billing';

export default function Outcomes() {
  const [tab, setTab] = useState<Tab>('outcomes');
  const [report, setReport] = useState<OutcomeReport | null>(null);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch<OutcomeReport>('/api/outcomes/report?days=30'),
      apiFetch<BillingSummary>('/api/outcomes/billing?days=30'),
    ])
      .then(([reportData, billingData]) => {
        setReport(reportData);
        setBilling(billingData);
        setError('');
      })
      .catch(() => setError('Could not load outcomes data'))
      .finally(() => setLoading(false));
  }, []);

  const handleReconcile = async () => {
    setReconciling(true);
    try {
      await apiFetch('/api/outcomes/billing/reconcile', { method: 'POST' });
      const updated = await apiFetch<BillingSummary>('/api/outcomes/billing?days=30');
      setBilling(updated);
    } catch {
      setError('Reconciliation failed');
    } finally {
      setReconciling(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-4xl font-semibold tracking-tight">Outcome Attribution</h1>
        <FeatureStatusFromTruth featureKey="outcomes" />
      </div>
      <p className="text-[var(--color-text-muted)] mb-6">
        Verified uplift and success-fee billing — proposed outcomes excluded
      </p>

      <div className="flex gap-2 mb-8">
        <button
          type="button"
          onClick={() => setTab('outcomes')}
          className={`px-4 py-2 rounded-lg text-sm ${tab === 'outcomes' ? 'bg-[var(--color-surface-elevated)] text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
        >
          Outcomes
        </button>
        <button
          type="button"
          onClick={() => setTab('billing')}
          className={`px-4 py-2 rounded-lg text-sm ${tab === 'billing' ? 'bg-[var(--color-surface-elevated)] text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
        >
          Billing
        </button>
      </div>

      {loading && <p className="text-[var(--color-text-subtle)]">Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && tab === 'outcomes' && report && (
        <>
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border-subtle)]">
              <div className="text-sm text-[var(--color-text-subtle)] mb-1">Total records</div>
              <div className="text-3xl font-bold">{report.totalRecords}</div>
            </div>
            <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border-subtle)]">
              <div className="text-sm text-[var(--color-text-subtle)] mb-1">Verified / billable</div>
              <div className="text-3xl font-bold">
                {report.verifiedCount} / {report.billableCount}
              </div>
            </div>
            <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border-subtle)]">
              <div className="text-sm text-[var(--color-text-subtle)] mb-1">Billable uplift (€)</div>
              <div className="text-3xl font-bold">{report.totalBillableUplift.toFixed(2)}</div>
            </div>
          </div>

          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border-subtle)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--color-text-subtle)] border-b border-[var(--color-border-subtle)]">
                  <th className="text-left p-4 font-medium">Metric</th>
                  <th className="text-left p-4 font-medium">Baseline</th>
                  <th className="text-left p-4 font-medium">Observed</th>
                  <th className="text-left p-4 font-medium">Uplift</th>
                  <th className="text-left p-4 font-medium">Confidence</th>
                  <th className="text-left p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.records.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--color-border-subtle)]/50">
                    <td className="p-4">{r.metric}</td>
                    <td className="p-4 text-[var(--color-text-muted)]">{r.baseline.toFixed(2)}</td>
                    <td className="p-4 text-[var(--color-text-muted)]">{r.observed.toFixed(2)}</td>
                    <td className="p-4">{r.uplift.toFixed(1)}%</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 max-w-[120px]">
                        <div
                          className="h-1.5 flex-1 rounded-full bg-[var(--color-border-subtle)]"
                          role="presentation"
                        >
                          <div
                            className="h-full rounded-full bg-[var(--color-intent)]"
                            style={{ width: `${Math.min(100, Math.round(r.confidence * 100))}%` }}
                          />
                        </div>
                        <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
                          {Math.round(r.confidence * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={
                          r.verificationStatus === 'billable'
                            ? 'text-green-400'
                            : r.verificationStatus === 'verified'
                              ? 'text-blue-400'
                              : 'text-[var(--color-text-subtle)]'
                        }
                      >
                        {r.verificationStatus}
                      </span>
                    </td>
                  </tr>
                ))}
                {report.records.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[var(--color-text-subtle)]">
                      No outcome records yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && tab === 'billing' && billing && (
        <>
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border-subtle)]">
              <div className="text-sm text-[var(--color-text-subtle)] mb-1">Billing records</div>
              <div className="text-3xl font-bold">{billing.totalRecords}</div>
            </div>
            <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border-subtle)]">
              <div className="text-sm text-[var(--color-text-subtle)] mb-1">Total fees (€)</div>
              <div className="text-3xl font-bold">{billing.totalAmount.toFixed(2)}</div>
            </div>
            <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border-subtle)]">
              <div className="text-sm text-[var(--color-text-subtle)] mb-1">Reconciled</div>
              <div className="text-3xl font-bold">{billing.reconciledCount}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReconcile}
            disabled={reconciling}
            className="mb-6 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-sm"
          >
            {reconciling ? 'Reconciling…' : 'Reconcile pending invoices'}
          </button>

          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border-subtle)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--color-text-subtle)] border-b border-[var(--color-border-subtle)]">
                  <th className="text-left p-4 font-medium">Outcome</th>
                  <th className="text-left p-4 font-medium">Amount</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {billing.records.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--color-border-subtle)]/50">
                    <td className="p-4 font-mono text-xs">{r.outcomeId.slice(0, 12)}…</td>
                    <td className="p-4">€{r.amount.toFixed(2)}</td>
                    <td className="p-4">{r.status}</td>
                    <td className="p-4 text-[var(--color-text-muted)] font-mono text-xs">
                      {r.stripeInvoiceId ?? '—'}
                    </td>
                  </tr>
                ))}
                {billing.records.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-[var(--color-text-subtle)]">
                      No billing records yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
