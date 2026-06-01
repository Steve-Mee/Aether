import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import React from 'react';
import { apiFetch, SupplierChangeRow } from '../lib/api';
import { useAsyncData } from '../lib/useAsyncData';
import FeatureStatusFromTruth from '../components/FeatureStatusFromTruth';
import AsyncBoundary from '../components/ui/AsyncBoundary';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { formatDate } from '../lib/i18n';

interface SupplierRow {
  id: string;
  name: string;
  website: string;
}

export default function Suppliers() {
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [creating, setCreating] = useState(false);
  const [monitoring, setMonitoring] = useState<string | null>(null);

  const { data: suppliers, error, loading, reload } = useAsyncData(() =>
    apiFetch<SupplierRow[]>('/api/suppliers')
  );

  const { data: changes, reload: reloadChanges } = useAsyncData(() =>
    apiFetch<SupplierChangeRow[]>('/api/suppliers/changes?status=pending')
  );

  const createSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !website.trim()) return;
    setCreating(true);
    try {
      await apiFetch('/api/suppliers', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), website: website.trim() }),
      });
      setName('');
      setWebsite('');
      reload();
    } finally {
      setCreating(false);
    }
  };

  const monitor = async (id: string) => {
    setMonitoring(id);
    try {
      await apiFetch(`/api/suppliers/${id}/monitor`, { method: 'POST', body: JSON.stringify({}) });
      reloadChanges();
    } finally {
      setMonitoring(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-4xl font-semibold tracking-tight">Suppliers</h1>
        <FeatureStatusFromTruth featureKey="supplier-intelligence" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card padding="lg">
          <h2 className="font-medium mb-4 flex items-center gap-2">
            <Plus size={18} className="text-purple-400" />
            Leverancier toevoegen
          </h2>
          <form onSubmit={createSupplier} className="space-y-3">
            <input
              type="text"
              placeholder="Naam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-sm"
              aria-label="Leverancier naam"
            />
            <input
              type="url"
              placeholder="https://..."
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-sm"
              aria-label="Website URL"
            />
            <button type="submit" disabled={creating} className="px-4 py-2 rounded-lg bg-purple-600 text-sm font-medium disabled:opacity-50">
              Toevoegen
            </button>
          </form>
        </Card>

        <Card padding="lg">
          <h2 className="font-medium mb-4">Pending wijzigingen</h2>
          {!changes || changes.length === 0 ? (
            <p className="text-sm text-[var(--color-text-subtle)]">Geen openstaande supplier diffs.</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-auto">
              {changes.map((c) => (
                <li key={c.id} className="text-sm border border-[var(--color-border-subtle)] rounded-lg p-3">
                  <p className="font-medium">{c.changeType}</p>
                  <p className="text-[var(--color-text-subtle)] text-xs">{formatDate(c.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        {!suppliers || suppliers.length === 0 ? (
          <EmptyState title="Geen leveranciers" description="Voeg een leverancier toe om monitoring te starten." />
        ) : (
          <div className="space-y-3">
            {suppliers.map((s) => (
              <Card key={s.id} padding="md" className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">{s.website}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={monitoring === s.id}
                  onClick={() => monitor(s.id)}
                >
                  <RefreshCw size={14} className={`inline mr-1 ${monitoring === s.id ? 'animate-spin' : ''}`} />
                  Monitor
                </Button>
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
