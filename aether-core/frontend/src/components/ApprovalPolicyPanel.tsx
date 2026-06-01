import { useState } from 'react';
import React from 'react';
import { apiFetch, TenantApprovalPolicy } from '../lib/api';
import { useAsyncData } from '../lib/useAsyncData';
import Card from './ui/Card';
import Button from './ui/Button';
import AsyncBoundary from './ui/AsyncBoundary';

export default function ApprovalPolicyPanel() {
  const { data, loading, error, reload } = useAsyncData(async () => {
    const res = await apiFetch<{ policy: TenantApprovalPolicy }>('/api/admin/policies/approval');
    return res.policy;
  });

  const [draft, setDraft] = useState<TenantApprovalPolicy | null>(null);
  const [saving, setSaving] = useState(false);
  const [autoResult, setAutoResult] = useState<string | null>(null);

  const policy = draft ?? data;

  const save = async () => {
    if (!policy) return;
    setSaving(true);
    try {
      await apiFetch('/api/admin/policies/approval', {
        method: 'PUT',
        body: JSON.stringify(policy),
      });
      setDraft(null);
      reload();
    } finally {
      setSaving(false);
    }
  };

  const runAutoApply = async () => {
    setAutoResult(null);
    const res = await apiFetch<{ applied: number; skipped: number }>('/api/approvals/auto-apply', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    setAutoResult(`${res.applied} goedgekeurd, ${res.skipped} overgeslagen (hoog risico)`);
  };

  const update = (patch: Partial<TenantApprovalPolicy>) => {
    if (!policy) return;
    setDraft({ ...policy, ...patch });
  };

  return (
    <Card padding="lg">
      <h3 className="font-semibold text-xl mb-2">Autonomie policies</h3>
      <p className="text-sm text-[var(--color-text-subtle)] mb-6">
        Auto-goedkeuring voor low-risk acties. High-risk vereist altijd handmatige beslissing.
      </p>

      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        {policy && (
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-4 text-sm">
              <span className="text-[var(--color-text-muted)]">Auto-goedkeuring actief</span>
              <input
                type="checkbox"
                checked={policy.enabled}
                onChange={(e) => update({ enabled: e.target.checked })}
                className="rounded"
              />
            </label>
            <label className="flex items-center justify-between gap-4 text-sm">
              <span className="text-[var(--color-text-muted)]">Auto-goedkeur laag risico</span>
              <input
                type="checkbox"
                checked={policy.autoApproveLowRisk}
                onChange={(e) => update({ autoApproveLowRisk: e.target.checked })}
                className="rounded"
              />
            </label>
            <label className="flex items-center justify-between gap-4 text-sm">
              <span className="text-[var(--color-text-muted)]">Auto-goedkeur mail (medium)</span>
              <input
                type="checkbox"
                checked={policy.autoApproveMediumRiskMail}
                onChange={(e) => update({ autoApproveMediumRiskMail: e.target.checked })}
                className="rounded"
              />
            </label>
            <label className="block text-sm">
              <span className="text-[var(--color-text-muted)]">Max auto prijswijziging (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                value={policy.maxAutoPriceChangePct}
                onChange={(e) => update({ maxAutoPriceChangePct: Number(e.target.value) })}
                className="mt-2 w-full bg-[var(--color-bg)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-white"
              />
            </label>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button variant="primary" size="sm" disabled={saving} onClick={save}>
                Opslaan
              </Button>
              <Button variant="secondary" size="sm" onClick={runAutoApply}>
                Pas auto-goedkeuring toe
              </Button>
            </div>
            {autoResult && <p className="text-sm text-emerald-400">{autoResult}</p>}
          </div>
        )}
      </AsyncBoundary>
    </Card>
  );
}
