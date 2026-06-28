import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bot } from 'lucide-react';
import ModulePageLayout from '@/components/shell/ModulePageLayout';
import { AsyncBoundary, EmptyState } from '@/components/ui';
import AgentCard from '@/components/agents/AgentCard';
import AgentDetailPanel from '@/components/agents/AgentDetailPanel';
import { useAgentsHub } from '@/hooks/useAgentsHub';
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
              {t('agents.hub.title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t('agents.hub.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/overview" className="text-sm font-medium text-primary hover:underline">
              {t('overview.link.fromAgents')} →
            </Link>
            <Link
              to="/timeline"
              className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline"
            >
              {t('agents.hub.timelineLink')} →
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
            variant="premium"
            title={t('agents.hub.empty.title')}
            description={t('agents.hub.empty.description')}
            icon={<Bot size={32} />}
          />
        ) : (
          <>
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
