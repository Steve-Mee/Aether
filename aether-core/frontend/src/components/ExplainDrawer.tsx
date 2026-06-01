import { useEffect, useState } from 'react';
import { X, Clock } from 'lucide-react';
import React from 'react';
import { apiFetch } from '../lib/api';
import { formatDate, t } from '../lib/i18n';
import AsyncBoundary from './ui/AsyncBoundary';
import Button from './ui/Button';

export interface ExplainTimeline {
  entityType: string;
  entityId: string;
  events: Array<{
    at: string;
    label: string;
    status?: string;
    module?: string;
    actor?: string;
    category?: string;
    actionType?: string;
    details?: unknown;
  }>;
}

interface ExplainDrawerProps {
  entityType: 'email' | 'approval';
  entityId: string;
  open: boolean;
  onClose: () => void;
}

export default function ExplainDrawer({ entityType, entityId, open, onClose }: ExplainDrawerProps) {
  const [timeline, setTimeline] = useState<ExplainTimeline | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !entityId) return;

    setLoading(true);
    setError(null);
    apiFetch<ExplainTimeline>(
      `/api/admin/explain?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`
    )
      .then(setTimeline)
      .catch((e) => setError(String(e instanceof Error ? e.message : e)))
      .finally(() => setLoading(false));
  }, [open, entityType, entityId]);

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
      <div
        className="fixed inset-0 bg-black/60 z-[60]"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t('approval.explain')}
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[var(--color-bg)] border-l border-[var(--color-border-subtle)] z-[70] flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-subtle)]">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock size={18} className="text-purple-400" />
            {t('approval.explain')}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Sluiten">
            <X size={18} />
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <AsyncBoundary loading={loading} error={error} onRetry={() => setLoading(true)}>
            {timeline && (
              <ol className="space-y-4">
                {timeline.events.map((event, i) => (
                  <li key={i} className="relative pl-6 border-l border-[var(--color-border-subtle)] pb-4 last:pb-0">
                    <span className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-purple-600" />
                    <p className="text-sm font-medium text-[var(--color-text)]">{event.label}</p>
                    <p className="text-xs text-[var(--color-text-subtle)] mt-1">
                      {event.at ? formatDate(event.at) : '—'}
                    </p>
                    {event.module && (
                      <p className="text-xs text-[var(--color-text-subtle)] mt-1">Module: {event.module}</p>
                    )}
                    {event.status && (
                      <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]">
                        {event.status}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </AsyncBoundary>
        </div>
      </aside>
    </>
  );
}
