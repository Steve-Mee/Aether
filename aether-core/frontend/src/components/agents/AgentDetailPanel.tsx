import React from 'react';
import { Link } from 'react-router-dom';
import ActivityRowCard from '@/components/activity-page/ActivityRowCard';
import { agentDisplayLabel } from '@/lib/agentDisplay';
import type { AgentActivityResponse, AgentRosterEntry } from '@/types/agents';

interface AgentDetailPanelProps {
  agent: AgentRosterEntry | null;
  activity: AgentActivityResponse | undefined;
  loading: boolean;
}

export default function AgentDetailPanel({ agent, activity, loading }: AgentDetailPanelProps) {
  if (!agent) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
        Selecteer een agent om recente activiteit te bekijken.
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
          Bekijk in Activiteit →
        </Link>
      </div>

      {agent.proactiveCount > 0 && activity?.proactiveSuggestions.length ? (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Proactieve suggesties
          </h3>
          <ul className="space-y-2">
            {activity.proactiveSuggestions.slice(0, 5).map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-border/50 bg-card px-3 py-2 text-sm"
              >
                <p className="font-medium text-foreground">{s.title}</p>
                {s.summary && <p className="text-xs text-muted-foreground mt-0.5">{s.summary}</p>}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recente acties
        </h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Laden…</p>
        ) : activity?.activity.length ? (
          <ul className="space-y-2">
            {activity.activity.slice(0, 10).map((item) => (
              <li key={item.id}>
                <ActivityRowCard item={item} onSelect={() => undefined} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nog geen recente activiteit voor deze agent.</p>
        )}
      </section>
    </div>
  );
}
