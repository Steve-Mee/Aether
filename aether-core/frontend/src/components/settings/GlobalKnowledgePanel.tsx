import { useEffect, useState } from 'react';
import { Card, SettingRow } from '@/components/ui';
import { apiFetch, apiRoutes } from '@/lib/api';
import { t } from '@/lib/i18n';

interface GlobalKnowledgeStatus {
  catalogVersion: string;
  lastSyncAt: string | null;
  appliedPatchCount: number;
  activeProfile: string;
  ktEnabled: boolean;
}

interface GlobalPatch {
  id: string;
  patchKey: string;
  title: string;
  kind: string;
  category: string;
  status: string;
  priority: number;
}

export default function GlobalKnowledgePanel() {
  const [status, setStatus] = useState<GlobalKnowledgeStatus | null>(null);
  const [patches, setPatches] = useState<GlobalPatch[]>([]);
  const [syncHistory, setSyncHistory] = useState<
    Array<{ syncedAt: string; appliedCount: number; catalogVersion: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statusRes, patchesRes, syncRes] = await Promise.all([
          apiFetch<GlobalKnowledgeStatus>(apiRoutes.admin.brainGlobalKnowledgeStatus),
          apiFetch<{ patches: GlobalPatch[] }>(apiRoutes.admin.brainGlobalPatchesActive),
          apiFetch<{
            history: Array<{ syncedAt: string; appliedCount: number; catalogVersion: string }>;
          }>(apiRoutes.admin.brainGlobalKnowledgeSyncHistory),
        ]);
        if (!cancelled) {
          setStatus(statusRes);
          setPatches(patchesRes.patches ?? []);
          setSyncHistory(syncRes.history ?? []);
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
      <Card variant="elevated" padding="lg" data-testid="global-knowledge-panel">
        <p className="text-sm text-muted-foreground">{t('settings.globalKnowledge.loading')}</p>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg" data-testid="global-knowledge-panel">
      <h2 className="text-title font-semibold text-foreground mb-2">
        {t('settings.section.globalKnowledge')}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">{t('settings.globalKnowledge.subtitle')}</p>

      {status && (
        <div className="space-y-3 mb-6 text-sm">
          <SettingRow label={t('settings.globalKnowledge.profile')} description="">
            <span className="text-foreground capitalize">{status.activeProfile}</span>
          </SettingRow>
          <SettingRow label={t('settings.globalKnowledge.syncStatus')} description="">
            <span className="text-foreground">
              {status.ktEnabled
                ? `${t('settings.globalKnowledge.syncEnabled').replace('{count}', String(status.appliedPatchCount))}`
                : t('settings.globalKnowledge.syncDisabled')}
            </span>
          </SettingRow>
          {status.lastSyncAt && (
            <p className="text-xs text-muted-foreground">
              {t('settings.globalKnowledge.lastSync')}:{' '}
              {new Date(status.lastSyncAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {patches.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">
            {t('settings.globalKnowledge.patchCatalog')}
          </h3>
          <ul className="space-y-2 text-sm">
            {patches.slice(0, 10).map((p) => (
              <li key={p.id} className="flex justify-between gap-2 border-b border-border/30 pb-2">
                <span className="text-foreground">{p.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {p.status} · {p.kind}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {syncHistory.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-foreground mb-2">
            {t('settings.globalKnowledge.syncTimeline')}
          </h3>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {syncHistory.slice(0, 5).map((row, i) => (
              <li key={`${row.syncedAt}-${i}`}>
                {new Date(row.syncedAt).toLocaleString()} — {row.appliedCount}{' '}
                {t('settings.globalKnowledge.patchesApplied')} ({row.catalogVersion})
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
