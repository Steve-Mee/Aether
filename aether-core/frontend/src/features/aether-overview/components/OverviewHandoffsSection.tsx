import { useState } from 'react';
import AgentBadge from '@/components/command/AgentBadge';
import AgentExplainabilitySheet from '@/components/explainability/AgentExplainabilitySheet';
import { SectionLabel } from '@/components/command-center/primitives';
import { agentDisplayLabel } from '@/lib/agentDisplay';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { t } from '@/lib/i18n';
import type { HandoffOverviewItem } from '../api/overviewApi';

interface OverviewHandoffsSectionProps {
  items: HandoffOverviewItem[];
}

function statusLabel(status: HandoffOverviewItem['status']): string {
  switch (status) {
    case 'completed':
      return t('overview.handoffs.statusCompleted');
    case 'failed':
      return t('overview.handoffs.statusFailed');
    case 'running':
      return t('overview.handoffs.statusRunning');
    default:
      return t('overview.handoffs.statusPending');
  }
}

export default function OverviewHandoffsSection({ items }: OverviewHandoffsSectionProps) {
  const [explain, setExplain] = useState<{ type: 'command' | 'proactive_suggestion'; id: string } | null>(
    null,
  );

  if (items.length === 0) return null;

  return (
    <section className="mb-8" data-testid="overview-handoffs-section">
      <SectionLabel
        title={t('overview.section.handoffs')}
        subtitle={t('overview.section.handoffs.subtitle')}
      />
      <ol className="mt-4 space-y-3" aria-label={t('overview.section.handoffs')}>
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-border/25 bg-card/40 px-4 py-3"
            data-testid={`handoff-row-${item.id}`}
          >
            <button
              type="button"
              className="w-full text-left"
              disabled={!item.explainSource}
              onClick={() => item.explainSource && setExplain(item.explainSource)}
            >
              <div className="flex flex-wrap items-center gap-2">
                <AgentBadge agentKey={item.fromAgentKey} size="sm" />
                <span className="text-muted-foreground text-xs" aria-hidden>
                  →
                </span>
                <AgentBadge agentKey={item.toAgentKey} size="sm" />
                <span className="text-[10px] rounded border border-border/40 px-1.5 py-0.5 text-muted-foreground">
                  {item.mode === 'async'
                    ? t('overview.handoffs.modeAsync')
                    : t('overview.handoffs.modeSync')}
                </span>
                <span className="text-[10px] text-muted-foreground">{statusLabel(item.status)}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatRelativeTime(item.at)}
                </span>
              </div>
              {(item.intent || item.summary) && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {item.summary ?? item.intent}
                </p>
              )}
              <p className="mt-1 text-[10px] text-muted-foreground/70">
                {agentDisplayLabel(item.fromAgentKey)} → {agentDisplayLabel(item.toAgentKey)}
              </p>
            </button>
          </li>
        ))}
      </ol>

      {explain && (
        <AgentExplainabilitySheet
          entityType={explain.type}
          entityId={explain.id}
          open
          onClose={() => setExplain(null)}
        />
      )}
    </section>
  );
}
