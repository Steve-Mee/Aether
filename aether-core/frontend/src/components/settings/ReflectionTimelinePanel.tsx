import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, SettingRow } from '@/components/ui';
import { apiFetch, apiRoutes } from '@/lib/api';
import { t } from '@/lib/i18n';

interface TimelineEntry {
  id: string;
  timestamp: string;
  kind: 'step' | 'experience' | 'handoff' | 'adaptive_hint' | 'distillation_draft';
  agentKey: string;
  sourceAgentKey?: string;
  runId?: string;
  delegationId?: string;
  summary: string;
  goalReached?: boolean;
  handoffTarget?: string;
}

const AGENT_KEYS = ['admin', 'mail', 'supplier'] as const;

function agentBadgeClass(agentKey: string): string {
  if (agentKey === 'mail') return 'bg-sky-500/15 text-sky-700';
  if (agentKey === 'supplier') return 'bg-amber-500/15 text-amber-800';
  return 'bg-violet-500/15 text-violet-700';
}

export default function ReflectionTimelinePanel() {
  const [items, setItems] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [handoffsOnly, setHandoffsOnly] = useState(false);

  const reload = async () => {
    const params = new URLSearchParams();
    if (agentFilter !== 'all') params.set('agentKey', agentFilter);
    if (handoffsOnly) params.set('includeHandoffs', 'true');
    const url = `${apiRoutes.admin.brainReflectionTimeline}?${params.toString()}`;
    const data = await apiFetch<{ items: TimelineEntry[] }>(url);
    setItems(data.items ?? []);
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
  }, [agentFilter, handoffsOnly]);

  const filtered = useMemo(() => {
    if (!handoffsOnly) return items;
    return items.filter((i) => i.kind === 'handoff');
  }, [items, handoffsOnly]);

  return (
    <Card className="space-y-4" data-testid="reflection-timeline-panel">
      <div>
        <h2 className="text-lg font-semibold">{t('settings.reflectionTimeline.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('settings.reflectionTimeline.subtitle')}</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="text-sm border rounded-md px-2 py-1"
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          aria-label={t('settings.reflectionTimeline.filterAgent')}
        >
          <option value="all">{t('settings.reflectionTimeline.allAgents')}</option>
          {AGENT_KEYS.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={handoffsOnly}
            onChange={(e) => setHandoffsOnly(e.target.checked)}
          />
          {t('settings.reflectionTimeline.handoffsOnly')}
        </label>
        <Button size="sm" variant="secondary" onClick={() => void reload()} disabled={loading}>
          {t('settings.reflectionTimeline.refresh')}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('settings.reflectionTimeline.loading')}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('settings.reflectionTimeline.empty')}</p>
      ) : (
        <ol className="space-y-3 border-l-2 border-border ml-2 pl-4">
          {filtered.map((entry) => (
            <li key={entry.id} className="relative">
              <span className="absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Badge className={agentBadgeClass(entry.agentKey)}>{entry.agentKey}</Badge>
                {entry.sourceAgentKey && entry.sourceAgentKey !== entry.agentKey && (
                  <span className="text-xs text-muted-foreground">← {entry.sourceAgentKey}</span>
                )}
                {entry.handoffTarget && <Badge variant="outline">→ {entry.handoffTarget}</Badge>}
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
                <Badge variant="outline">{entry.kind}</Badge>
                {entry.goalReached != null && (
                  <Badge variant={entry.goalReached ? 'default' : 'danger'}>
                    {entry.goalReached ? 'goal ✓' : 'goal ✗'}
                  </Badge>
                )}
              </div>
              <p className="text-sm">{entry.summary}</p>
              {entry.runId && (
                <p className="text-xs text-muted-foreground mt-1">
                  run: {entry.runId.slice(0, 8)}…
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
