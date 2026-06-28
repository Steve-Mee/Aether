import { useEffect, useState } from 'react';
import { Card, SettingRow } from '@/components/ui';
import { apiFetch, apiRoutes } from '@/lib/api';
import { t } from '@/lib/i18n';

interface MemorySummary {
  shortTermCount: number;
  conversationTurnCount: number;
  episodicCount: number;
  semanticCount: number;
  interactionCount: number;
  lastConsolidatedAt?: string;
}

interface MemoryEntry {
  id: string;
  kind: string;
  command: string;
  summary: string;
  priority?: string;
  rememberedAt?: string;
  expiresAt?: string;
}

export default function MemoryPanel() {
  const [summary, setSummary] = useState<MemorySummary | null>(null);
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    const [summaryRes, entriesRes] = await Promise.all([
      apiFetch<MemorySummary>(apiRoutes.admin.brainMemorySummary),
      apiFetch<{ entries: MemoryEntry[] }>(apiRoutes.admin.brainMemoryEntries),
    ]);
    setSummary(summaryRes);
    setEntries(entriesRes.entries ?? []);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await reload();
      } catch {
        // best-effort
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearShortTerm = async () => {
    setBusy(true);
    try {
      await apiFetch(apiRoutes.admin.brainMemoryClearShortTerm, { method: 'POST' });
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const consolidate = async () => {
    setBusy(true);
    try {
      await apiFetch(apiRoutes.admin.brainMemoryConsolidate, { method: 'POST' });
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const deleteEntry = async (id: string) => {
    setBusy(true);
    try {
      await apiFetch(apiRoutes.admin.brainMemoryDeleteEntry(id), { method: 'DELETE' });
      await reload();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Card variant="elevated" padding="lg" data-testid="memory-panel">
        <p className="text-sm text-muted-foreground">{t('settings.personalMemory.loading')}</p>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg" data-testid="memory-panel">
      <h2 className="text-title font-semibold text-foreground mb-2">
        {t('settings.section.personalMemory')}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">{t('settings.personalMemory.subtitle')}</p>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 text-sm">
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-muted-foreground">{t('settings.personalMemory.episodic')}</p>
            <p className="text-lg font-semibold">{summary.episodicCount}</p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-muted-foreground">{t('settings.personalMemory.semantic')}</p>
            <p className="text-lg font-semibold">{summary.semanticCount}</p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-muted-foreground">{t('settings.personalMemory.shortTerm')}</p>
            <p className="text-lg font-semibold">{summary.shortTermCount}</p>
          </div>
        </div>
      )}

      {summary?.lastConsolidatedAt && (
        <SettingRow label={t('settings.personalMemory.lastConsolidated')} description="">
          <span className="text-foreground text-sm">
            {new Date(summary.lastConsolidatedAt).toLocaleString()}
          </span>
        </SettingRow>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 disabled:opacity-50"
          disabled={busy}
          onClick={() => void clearShortTerm()}
        >
          {t('settings.personalMemory.clearShortTerm')}
        </button>
        <button
          type="button"
          className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 disabled:opacity-50"
          disabled={busy}
          onClick={() => void consolidate()}
        >
          {t('settings.personalMemory.consolidateNow')}
        </button>
      </div>

      {entries.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border/60">
                <th className="py-2 pr-3">{t('settings.personalMemory.kind')}</th>
                <th className="py-2 pr-3">{t('settings.personalMemory.summary')}</th>
                <th className="py-2 pr-3">{t('settings.personalMemory.age')}</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-border/40">
                  <td className="py-2 pr-3">
                    <span className="text-xs uppercase tracking-wide text-primary/90">
                      {entry.kind}
                    </span>
                  </td>
                  <td
                    className="py-2 pr-3 max-w-xs truncate"
                    title={entry.summary || entry.command}
                  >
                    {entry.summary || entry.command}
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {entry.rememberedAt ? new Date(entry.rememberedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      className="text-xs text-destructive hover:underline disabled:opacity-50"
                      disabled={busy}
                      onClick={() => void deleteEntry(entry.id)}
                    >
                      {t('settings.personalMemory.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('settings.personalMemory.empty')}</p>
      )}
    </Card>
  );
}
