import { useEffect, useState } from 'react';
import { Card, SettingRow } from '@/components/ui';
import { apiFetch, apiRoutes } from '@/lib/api';
import { t } from '@/lib/i18n';

interface ContributionSummary {
  submitted30d: number;
  rejected30d: number;
  lastContributionAt: string | null;
  federatedOptIn: boolean;
}

interface ContributionEntry {
  id: string;
  source: string;
  category: string;
  metric: string;
  sampleSize: number;
  submitted: boolean;
  rejectReason: string | null;
  createdAt: string;
}

function rejectLabel(reason: string | null): string {
  if (!reason) return '—';
  const key = `settings.contribution.reject.${reason}` as const;
  const translated = t(key);
  return translated === key ? reason : translated;
}

export default function ContributionHistoryPanel() {
  const [summary, setSummary] = useState<ContributionSummary | null>(null);
  const [entries, setEntries] = useState<ContributionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [summaryRes, historyRes] = await Promise.all([
          apiFetch<ContributionSummary>(apiRoutes.admin.brainContributionSummary),
          apiFetch<{ entries: ContributionEntry[] }>(apiRoutes.admin.brainContributionHistory),
        ]);
        if (!cancelled) {
          setSummary(summaryRes);
          setEntries(historyRes.entries ?? []);
        }
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

  if (loading) {
    return (
      <Card variant="elevated" padding="lg" data-testid="contribution-history-panel">
        <p className="text-sm text-muted-foreground">{t('settings.contribution.loading')}</p>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg" data-testid="contribution-history-panel">
      <h2 className="text-title font-semibold text-foreground mb-2">
        {t('settings.section.contributionHistory')}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">{t('settings.contribution.subtitle')}</p>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-sm">
          <div className="rounded-lg border border-border/40 p-3">
            <p className="text-muted-foreground">{t('settings.contribution.submitted30d')}</p>
            <p className="text-lg font-semibold text-foreground">{summary.submitted30d}</p>
          </div>
          <div className="rounded-lg border border-border/40 p-3">
            <p className="text-muted-foreground">{t('settings.contribution.rejected30d')}</p>
            <p className="text-lg font-semibold text-foreground">{summary.rejected30d}</p>
          </div>
          <div className="rounded-lg border border-border/40 p-3">
            <p className="text-muted-foreground">{t('settings.contribution.federatedOptIn')}</p>
            <p className="text-lg font-semibold text-foreground">
              {summary.federatedOptIn ? 'Ja' : 'Nee'}
            </p>
          </div>
        </div>
      )}

      {summary?.lastContributionAt && (
        <p className="text-xs text-muted-foreground mb-4">
          {t('settings.contribution.lastAt')}: {new Date(summary.lastContributionAt).toLocaleString()}
        </p>
      )}

      {entries.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border/30">
                <th className="pb-2 pr-2">{t('settings.contribution.colDate')}</th>
                <th className="pb-2 pr-2">{t('settings.contribution.colCategory')}</th>
                <th className="pb-2 pr-2">{t('settings.contribution.colMetric')}</th>
                <th className="pb-2 pr-2">{t('settings.contribution.colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 25).map((e) => (
                <tr key={e.id} className="border-b border-border/20">
                  <td className="py-2 pr-2 text-xs text-muted-foreground">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-2">{e.category}</td>
                  <td className="py-2 pr-2 font-mono text-xs">{e.metric}</td>
                  <td className="py-2 pr-2">
                    {e.submitted
                      ? t('settings.contribution.statusSubmitted')
                      : rejectLabel(e.rejectReason)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('settings.contribution.empty')}</p>
      )}
    </Card>
  );
}
