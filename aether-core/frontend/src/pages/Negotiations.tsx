import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import FeatureStatusFromTruth from '../components/FeatureStatusFromTruth';

interface Negotiation {
  id: string;
  status: string;
  currentOffer: number | null;
  productId: string | null;
  updatedAt: string;
}

export default function Negotiations() {
  const [items, setItems] = useState<Negotiation[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ negotiations: Negotiation[] }>('/api/agentic/negotiations')
      .then((res) => setItems(res.negotiations ?? []))
      .catch(() => setError('Agentic module unavailable or feature-gated'));
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-4xl font-semibold tracking-tight">Negotiations</h1>
        <FeatureStatusFromTruth featureKey="agentic-commerce" />
      </div>
      <p className="text-[var(--color-text-muted)] mb-8">Agentic commerce — read-only overview</p>

      {error && <p className="text-amber-400">{error}</p>}

      <div className="space-y-3">
        {items.map((n) => (
          <div key={n.id} className="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border-subtle)] flex justify-between">
            <div>
              <div className="font-medium">{n.id.slice(0, 12)}…</div>
              <div className="text-sm text-[var(--color-text-subtle)]">Product: {n.productId ?? '—'}</div>
            </div>
            <div className="text-right">
              <div className="text-sm capitalize">{n.status}</div>
              <div className="text-[var(--color-text-muted)]">€{n.currentOffer?.toFixed(2) ?? '—'}</div>
            </div>
          </div>
        ))}
        {!error && items.length === 0 && (
          <p className="text-[var(--color-text-subtle)]">No active negotiations</p>
        )}
      </div>
    </div>
  );
}
