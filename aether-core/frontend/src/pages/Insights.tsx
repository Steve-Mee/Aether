import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { t } from '../lib/i18n';
import FeatureStatusFromTruth from '../components/FeatureStatusFromTruth';
import AsyncBoundary from '../components/ui/AsyncBoundary';

interface InsightData {
  categories: Record<string, number>;
  insightCount: number;
  privacyBudget?: { spent: number; budgetLimit: number };
}

export default function Insights() {
  const [data, setData] = useState<InsightData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<InsightData>('/api/hive-mind/insights/aggregated')
      .then((result) => {
        setData(result);
        setError('');
      })
      .catch(() => setError(t('insights.error')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--color-text)]">{t('insights.title')}</h1>
        <FeatureStatusFromTruth featureKey="hive-mind" />
      </div>
      <p className="text-[var(--color-text-muted)] mb-8">{t('insights.subtitle')}</p>

      <AsyncBoundary loading={loading} error={error || null}>
        {data && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] p-6 border border-[var(--color-border-subtle)]">
              <div className="text-sm text-[var(--color-text-subtle)] mb-1">{t('insights.total')}</div>
              <div className="text-3xl font-bold text-[var(--color-text)]">{data.insightCount}</div>
            </div>
            {data.privacyBudget && (
              <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] p-6 border border-[var(--color-border-subtle)]">
                <div className="text-sm text-[var(--color-text-subtle)] mb-1">{t('insights.privacyBudget')}</div>
                <div className="text-3xl font-bold text-[var(--color-text)]">
                  {data.privacyBudget.spent.toFixed(1)} / {data.privacyBudget.budgetLimit}
                </div>
              </div>
            )}
            <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] p-6 border border-[var(--color-border-subtle)] md:col-span-2">
              <div className="text-sm text-[var(--color-text-subtle)] mb-4">{t('insights.categories')}</div>
              <div className="space-y-2">
                {Object.entries(data.categories ?? {}).map(([cat, count]) => (
                  <div key={cat} className="flex justify-between text-sm">
                    <span className="capitalize text-[var(--color-text)]">{cat}</span>
                    <span className="text-[var(--color-text-muted)]">{count}</span>
                  </div>
                ))}
                {Object.keys(data.categories ?? {}).length === 0 && (
                  <p className="text-[var(--color-text-muted)] text-sm">{t('insights.empty')}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
