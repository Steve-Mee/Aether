import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ActivityRowCard from '@/components/activity-page/ActivityRowCard';
import ActivityDetailSheet from '@/components/activity-page/ActivityDetailSheet';
import AgentExplainabilitySheet from '@/components/explainability/AgentExplainabilitySheet';
import { Skeleton } from '@/components/ui';
import { agentDisplayLabel } from '@/lib/agentDisplay';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import { t } from '@/lib/i18n';
import type { ExplainEntityType } from '@/types/explainability';
import type { AgentActivityResponse, AgentRosterEntry } from '@/types/agents';
import type { ActivityItem } from '@/types/activity';

interface AgentDetailPanelProps {
  agent: AgentRosterEntry | null;
  activity: AgentActivityResponse | undefined;
  loading: boolean;
}

export default function AgentDetailPanel({ agent, activity, loading }: AgentDetailPanelProps) {
  const { settings } = useMerchantSettings();
  const [selectedItem, setSelectedItem] = useState<ActivityItem | null>(null);
  const [explainItem, setExplainItem] = useState<ActivityItem | null>(null);

  const activityItems = useMemo(() => activity?.activity ?? [], [activity?.activity]);
  const showInlineExplain = settings.explainabilityPrefs.detailLevel !== 'off';

  if (!agent) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
        {t('agents.detail.selectAgent')}
      </div>
    );
  }

  const label = agentDisplayLabel(agent.agentKey);

  return (
    <div className="space-y-6" data-testid="agent-detail-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{label}</h2>
          <p className="text-sm text-muted-foreground">{agent.description}</p>
        </div>
        <Link
          to={`/timeline?agent=${encodeURIComponent(agent.agentKey)}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          {t('agents.hub.timelineLink')} →
        </Link>
      </div>

      {agent.proactiveCount > 0 && activity?.proactiveSuggestions.length ? (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('agents.detail.proactiveSuggestions')}
          </h3>
          <ul className="space-y-2">
            {activity.proactiveSuggestions.slice(0, 5).map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-border/35 bg-card/40 px-3 py-2.5 text-sm"
              >
                <p className="font-medium text-foreground">{s.title}</p>
                {s.summary && (
                  <p className="text-xs text-muted-foreground mt-0.5">{s.summary}</p>
                )}
                <Link
                  to="/command-center"
                  className="text-[10px] text-primary hover:underline mt-1 inline-block"
                >
                  {t('commandCenter.proactive.run')} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('agents.detail.recentActivity')}
        </h3>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        ) : activityItems.length ? (
          <ul className="space-y-2">
            {activityItems.slice(0, 10).map((item) => (
              <li key={item.id}>
                <ActivityRowCard
                  item={item}
                  onSelect={() => setSelectedItem(item)}
                  showInlineExplain={showInlineExplain}
                  onExplain={setExplainItem}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t('agents.detail.noActivity')}</p>
        )}
      </section>

      <ActivityDetailSheet
        item={selectedItem}
        open={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
      />

      {explainItem && (
        <AgentExplainabilitySheet
          entityType={explainItem.details?.explainabilitySourceType as ExplainEntityType}
          entityId={String(explainItem.details?.explainabilitySourceId)}
          title={explainItem.description}
          open={Boolean(explainItem)}
          onClose={() => setExplainItem(null)}
        />
      )}
    </div>
  );
}
