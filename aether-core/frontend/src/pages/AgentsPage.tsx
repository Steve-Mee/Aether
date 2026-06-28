import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bot } from 'lucide-react';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { AsyncBoundary, EmptyState } from '@/components/ui';
import AgentCard from '@/components/agents/AgentCard';
import AgentDetailPanel from '@/components/agents/AgentDetailPanel';
import { useAgentsHub } from '@/hooks/useAgentsHub';
import { agentDisplayLabel } from '@/lib/agentDisplay';
import { t } from '@/lib/i18n';

export default function AgentsPage() {
  const hub = useAgentsHub();

  const selectedAgent = useMemo(
    () => hub.agents.find((a) => a.agentKey === hub.selectedAgentKey) ?? null,
    [hub.agents, hub.selectedAgentKey],
  );

  return (
    <ModulePageLayout
      testId="agents-page"
      maxWidth="5xl"
      header={
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" aria-hidden />
              Agents Hub
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Overzicht van specialist agents, status en recente activiteit.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/overview" className="text-sm font-medium text-primary hover:underline">
              {t('overview.link.fromAgents')} →
            </Link>
            <Link
              to="/timeline"
              className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline"
            >
              Activiteitlog →
            </Link>
          </div>
        </div>
      }
      loading={false}
      error={null}
      wrapAsync={false}
    >
      <AsyncBoundary loading={hub.loading} error={null} onRetry={hub.reload}>
        {hub.agents.length === 0 ? (
          <EmptyState
            title="Geen agents beschikbaar"
            description="Multi-agent delegatie is mogelijk uitgeschakeld."
            icon={<Bot size={32} />}
          />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              {hub.agents.map((agent) => (
                <button
                  key={agent.agentKey}
                  type="button"
                  onClick={() => hub.selectAgent(agent.agentKey)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    hub.selectedAgentKey === agent.agentKey
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {agentDisplayLabel(agent.agentKey)}
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
              {hub.agents.map((agent) => (
                <AgentCard
                  key={agent.agentKey}
                  agent={agent}
                  selected={hub.selectedAgentKey === agent.agentKey}
                  onSelect={() => hub.selectAgent(agent.agentKey)}
                />
              ))}
            </div>

            <AgentDetailPanel
              agent={selectedAgent}
              activity={hub.activity}
              loading={hub.activityLoading}
            />
          </>
        )}
      </AsyncBoundary>
    </ModulePageLayout>
  );
}
