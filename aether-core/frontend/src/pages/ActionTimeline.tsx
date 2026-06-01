import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import React from 'react';
import { apiFetch } from '../lib/api';
import { useAsyncData } from '../lib/useAsyncData';
import { useCommand } from '../lib/CommandContext';
import { formatDate, t } from '../lib/i18n';
import AsyncBoundary from '../components/ui/AsyncBoundary';
import Card from '../components/ui/Card';
import { ConfidenceChip } from '../components/ui/RiskBadge';
import EmptyStatePremium from '../components/ui/EmptyStatePremium';
import { Sparkles } from 'lucide-react';
import type { CommandResult } from '../lib/CommandContext';

interface ServerCommand {
  id: string;
  command: string;
  result: string | null;
  intent: string | null;
  confidence: number | null;
  createdAt: string;
}

interface TimelineEntry {
  id: string;
  source: 'session' | 'server';
  label: string;
  detail: string;
  at: string;
  confidence?: number;
}

export default function ActionTimeline() {
  const { history, openPalette } = useCommand();
  const { data: serverCommands, error, loading, reload } = useAsyncData(() =>
    apiFetch<{ commands: ServerCommand[] }>('/api/admin/commands').then((r) => r.commands)
  );

  const entries = useMemo(() => {
    const list: TimelineEntry[] = [];

    for (const h of history as CommandResult[]) {
      list.push({
        id: `local-${h.timestamp ?? h.result}`,
        source: 'session',
        label: h.originalCommand ?? h.parsedIntent,
        detail: h.result,
        at: h.timestamp ?? new Date().toISOString(),
        confidence: h.confidence,
      });
    }

    for (const c of serverCommands ?? []) {
      list.push({
        id: `server-${c.id}`,
        source: 'server',
        label: c.intent ? `${c.intent}: ${c.command}` : c.command,
        detail: c.result ?? '—',
        at: c.createdAt,
        confidence: c.confidence ?? undefined,
      });
    }

    return list.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [history, serverCommands]);

  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl font-semibold tracking-tight mb-2 text-[var(--color-text)]">{t('nav.timeline')}</h1>
      <p className="text-[var(--color-text-muted)] mb-8">
        Gecombineerde command- en actiegeschiedenis — intent-first overzicht.
      </p>

      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        {entries.length === 0 ? (
          <EmptyStatePremium
            title="Nog geen acties"
            description="Start met een natuurlijk taal commando."
            actionLabel={t('command.palette.title')}
            onAction={openPalette}
            icon={<Sparkles size={32} />}
          />
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li key={entry.id}>
                <Card padding="md">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs uppercase tracking-wide text-[var(--color-text-subtle)]">
                      {entry.source === 'session' ? 'Sessie' : 'Server'}
                    </span>
                    <span className="text-xs text-[var(--color-text-subtle)] ml-auto">
                      {formatDate(entry.at)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[var(--color-text)] mt-2">{entry.label}</p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">{entry.detail}</p>
                  {entry.confidence != null && (
                    <div className="mt-2">
                      <ConfidenceChip confidence={entry.confidence} />
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </AsyncBoundary>

      <p className="text-sm text-[var(--color-text-subtle)] mt-6">
        <Link to="/workstream" className="text-[var(--color-intent)] hover:underline">
          {t('workstream.title')}
        </Link>
      </p>
    </div>
  );
}
