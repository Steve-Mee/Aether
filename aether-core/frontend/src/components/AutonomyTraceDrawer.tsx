import { useEffect, useState } from 'react';
import { X, Clock } from 'lucide-react';
import React from 'react';
import { apiFetch } from '../lib/api';
import { formatDate, t } from '../lib/i18n';
import AsyncBoundary from './ui/AsyncBoundary';
import Button from './ui/Button';

interface AutonomyTraceEvent {
  kind?: string;
  at?: string;
  label?: string;
  stage?: string;
  module?: string;
  workflow?: string;
  status?: string;
}

interface AutonomyTraceResponse {
  events: AutonomyTraceEvent[];
}

interface AutonomyTraceDrawerProps {
  open: boolean;
  onClose: () => void;
  decisionTitle?: string;
  decisionDetail?: string;
}

export default function AutonomyTraceDrawer({
  open,
  onClose,
  decisionTitle,
  decisionDetail,
}: AutonomyTraceDrawerProps) {
  const [trace, setTrace] = useState<AutonomyTraceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    apiFetch<AutonomyTraceResponse>('/api/admin/autonomy/trace?limit=30')
      .then(setTrace)
      .catch((e) => setError(String(e instanceof Error ? e.message : e)))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[60]" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t('autonomous.trace')}
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[var(--color-surface)] border-l border-[var(--color-border-subtle)] z-[70] flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-subtle)]">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock size={18} className="text-[var(--color-accent)]" />
            {t('autonomous.trace')}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Sluiten">
            <X size={18} />
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {decisionTitle && (
            <div className="mb-4 p-3 rounded-[var(--radius-lg)] bg-[var(--color-bg)] border border-[var(--color-border-subtle)]">
              <p className="text-sm font-medium text-[var(--color-text)]">{decisionTitle}</p>
              {decisionDetail && (
                <p className="text-xs text-[var(--color-text-muted)] mt-1">{decisionDetail}</p>
              )}
            </div>
          )}
          <AsyncBoundary loading={loading} error={error} onRetry={() => setLoading(true)}>
            {trace && trace.events.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">Geen trace-events beschikbaar.</p>
            ) : (
              trace && (
                <ol className="space-y-4">
                  {trace.events.map((event, i) => (
                    <li key={i} className="relative pl-6 border-l border-[var(--color-border-subtle)] pb-4 last:pb-0">
                      <span className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-[var(--color-accent)]" />
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        {event.label ?? event.stage ?? event.workflow ?? 'Event'}
                      </p>
                      <p className="text-xs text-[var(--color-text-subtle)] mt-1">
                        {event.at ? formatDate(String(event.at)) : '—'}
                      </p>
                      {event.module && (
                        <p className="text-xs text-[var(--color-text-subtle)] mt-1">{event.module}</p>
                      )}
                    </li>
                  ))}
                </ol>
              )
            )}
          </AsyncBoundary>
        </div>
      </aside>
    </>
  );
}
