import { useState } from 'react';
import { Mail, HelpCircle } from 'lucide-react';
import React from 'react';
import { apiFetch, EmailDetail } from '../lib/api';
import { useAsyncData } from '../lib/useAsyncData';
import FeatureStatusFromTruth from '../components/FeatureStatusFromTruth';
import AsyncBoundary from '../components/ui/AsyncBoundary';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import RiskBadge from '../components/ui/RiskBadge';
import ExplainDrawer from '../components/ExplainDrawer';
import { formatDate, t } from '../lib/i18n';
import type { RiskBand } from '../lib/intentNavigation';

interface EmailRow {
  id: string;
  from: string;
  subject: string | null;
  status: string;
  riskLevel: string | null;
  category: string | null;
  confidence: number | null;
}

function mapRisk(level: string | null): RiskBand {
  if (level === 'high') return 'high';
  if (level === 'low') return 'low';
  return 'medium';
}

export default function Emails() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [explainOpen, setExplainOpen] = useState(false);

  const { data: emails, error, loading, reload } = useAsyncData(() =>
    apiFetch<EmailRow[]>('/api/emails')
  );

  const { data: detail, loading: detailLoading } = useAsyncData(async () => {
    if (!selectedId) return null;
    return apiFetch<EmailDetail>(`/api/emails/${selectedId}`);
  }, [selectedId]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[60vh]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-4xl font-semibold tracking-tight">AETHER Mail</h1>
          <FeatureStatusFromTruth featureKey="aether-mail" />
        </div>

        <AsyncBoundary loading={loading} error={error} onRetry={reload}>
          {!emails || emails.length === 0 ? (
            <EmptyState
              title="Geen mails"
              description="Mails verschijnen na verwerking via IMAP of POST /api/emails/process."
              icon={<Mail size={32} />}
            />
          ) : (
            <div className="space-y-2">
              {emails.map((email) => (
                <button
                  key={email.id}
                  type="button"
                  onClick={() => setSelectedId(email.id)}
                  className={`w-full text-left p-4 rounded-[var(--radius-xl)] border transition-colors focus-visible:shadow-[var(--shadow-focus)] ${
                    selectedId === email.id
                      ? 'border-purple-500/50 bg-[var(--color-surface)]'
                      : 'border-[var(--color-border-subtle)] bg-[var(--color-surface)]/50 hover:border-[var(--color-border)]'
                  }`}
                >
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{email.subject ?? '(geen onderwerp)'}</p>
                      <p className="text-sm text-[var(--color-text-muted)] truncate">{email.from}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <RiskBadge band={mapRisk(email.riskLevel)} />
                      <p className="text-xs text-[var(--color-text-subtle)] mt-1">{email.status}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </AsyncBoundary>
      </div>

      <aside
        aria-label="Mail detail"
        className="w-full lg:w-96 shrink-0 border border-[var(--color-border-subtle)] rounded-[var(--radius-xl)] bg-[var(--color-bg)] overflow-hidden"
      >
        {!selectedId ? (
          <p className="p-8 text-[var(--color-text-subtle)] text-sm">Selecteer een mail voor thread & AI-draft.</p>
        ) : detailLoading ? (
          <p className="p-8 text-[var(--color-text-subtle)]">{t('async.loading')}</p>
        ) : detail ? (
          <div className="p-6 space-y-4">
            <div>
              <p className="text-lg font-medium">{detail.subject ?? '(geen onderwerp)'}</p>
              <p className="text-sm text-[var(--color-text-muted)]">{detail.from}</p>
              <p className="text-xs text-[var(--color-text-subtle)] mt-2">{formatDate(detail.createdAt)}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <RiskBadge band={mapRisk(detail.riskLevel)} />
              {detail.category && (
                <span className="text-xs px-2 py-1 rounded bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]">{detail.category}</span>
              )}
            </div>

            {detail.body && (
              <Card padding="sm" className="text-sm text-[var(--color-text-muted)] whitespace-pre-wrap max-h-40 overflow-auto">
                {detail.body}
              </Card>
            )}

            {detail.draftReply && (
              <div>
                <p className="text-xs text-[var(--color-text-subtle)] uppercase tracking-wide mb-2">AI concept</p>
                <Card padding="sm" className="text-sm text-emerald-300/90 whitespace-pre-wrap">
                  {detail.draftReply}
                </Card>
              </div>
            )}

            <Button variant="ghost" size="sm" onClick={() => setExplainOpen(true)}>
              <HelpCircle size={14} className="inline mr-1" />
              {t('approval.explain')}
            </Button>
          </div>
        ) : null}
      </aside>

      {selectedId && (
        <ExplainDrawer
          entityType="email"
          entityId={selectedId}
          open={explainOpen}
          onClose={() => setExplainOpen(false)}
        />
      )}
    </div>
  );
}
