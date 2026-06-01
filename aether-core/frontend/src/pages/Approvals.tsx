import { useState } from 'react';
import { apiFetch } from '../lib/api';
import FeatureStatusFromTruth from '../components/FeatureStatusFromTruth';
import AsyncBoundary from '../components/ui/AsyncBoundary';
import DecisionCard, { type ApprovalItem } from '../components/DecisionCard';
import EmptyState from '../components/ui/EmptyState';
import { useAsyncData } from '../lib/useAsyncData';
import { t } from '../lib/i18n';
import React from 'react';

export default function Approvals() {
  const [resolving, setResolving] = useState<string | null>(null);
  const { data: approvals, error, loading, reload } = useAsyncData(() =>
    apiFetch<ApprovalItem[]>('/api/approvals')
  );

  const resolve = async (id: string, approve: boolean) => {
    setResolving(id);
    try {
      await apiFetch(`/api/approvals/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ approve }),
      });
      reload();
    } finally {
      setResolving(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-4xl font-semibold tracking-tight">{t('nav.approvals')}</h1>
        <FeatureStatusFromTruth featureKey="approvals-audit" />
      </div>

      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        {!approvals || approvals.length === 0 ? (
          <EmptyState
            title="Geen openstaande goedkeuringen"
            description="AETHER handelt low-risk acties autonoom af."
          />
        ) : (
          <div className="space-y-4">
            {approvals.map((a) => (
              <DecisionCard
                key={a.id}
                approval={a}
                onApprove={(id) => resolve(id, true)}
                onReject={(id) => resolve(id, false)}
                resolving={resolving === a.id}
              />
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
