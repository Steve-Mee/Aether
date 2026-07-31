import { lazy, Suspense, useMemo } from 'react';
import type { CommandResult } from '@/lib/CommandContext';
import { agentDisplayLabel } from '@/lib/agentDisplay';
import { buildClientFlowGraph } from '@/lib/explain/buildClientFlowGraph';
import { t } from '@/lib/i18n';
import AgentBadge from './AgentBadge';
import HandoffChainRail, { executionModeBadgeLabel } from './HandoffChainRail';
import SharedMemoryRail from './SharedMemoryRail';
import AgentContributionsPanel from './AgentContributionsPanel';

const AgentFlowDiagram = lazy(() => import('@/components/explainability/AgentFlowDiagram'));

interface CommandResultHeaderProps {
  result: CommandResult;
  showFlowDiagram: boolean;
}

export default function CommandResultHeader({ result, showFlowDiagram }: CommandResultHeaderProps) {
  const brain = result.brain;
  const activeAgents =
    brain?.agents && brain.agents.length > 0
      ? brain.agents
      : brain?.specialist
        ? [brain.specialist]
        : [];
  const headerLabel =
    activeAgents.length === 1
      ? agentDisplayLabel(activeAgents[0].agentKey)
      : activeAgents.length > 1
        ? t('command.brain.parallelAgents')
        : 'AETHER';

  const resultFlowGraph = useMemo(() => {
    const chain = brain?.handoffChain;
    if (!chain || chain.length <= 1) return null;
    const keys = (brain?.agents ?? []).map((a) => a.agentKey);
    return buildClientFlowGraph(chain, keys);
  }, [brain?.handoffChain, brain?.agents]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/65">
          {headerLabel}
        </p>
        {brain?.executionMode && executionModeBadgeLabel(brain.executionMode) && (
          <span className="text-[10px] rounded-md border border-border/40 px-1.5 py-0.5 text-muted-foreground">
            {executionModeBadgeLabel(brain.executionMode)}
          </span>
        )}
        {activeAgents.map((agent) => (
          <AgentBadge
            key={`${agent.agentKey}-${agent.specialistRunId ?? 'primary'}`}
            agentKey={agent.agentKey}
            delegatedFrom={agent.delegatedFrom}
            chainFrom={brain?.handoffChain?.find((h) => h.to === agent.agentKey)?.from}
          />
        ))}
      </div>
      {brain?.handoffChain && brain.handoffChain.length > 0 && (
        <HandoffChainRail chain={brain.handoffChain} />
      )}
      {showFlowDiagram && resultFlowGraph && (
        <Suspense fallback={<div className="h-28 animate-pulse bg-muted/30 rounded mb-2" />}>
          <AgentFlowDiagram
            graph={resultFlowGraph}
            height={150}
            className="mb-2 rounded-lg border border-border/40"
          />
        </Suspense>
      )}
      {brain?.sharedMemorySummary && Object.keys(brain.sharedMemorySummary).length > 0 && (
        <SharedMemoryRail
          entries={Object.entries(brain.sharedMemorySummary).map(([key, value]) => ({
            namespace: 'shared',
            key,
            valuePreview: JSON.stringify(value).slice(0, 200),
          }))}
          defaultCollapsed
        />
      )}
      {brain?.agentContributions && brain.agentContributions.length > 0 && (
        <AgentContributionsPanel
          contributions={brain.agentContributions}
          conflicts={brain.actionConflicts}
        />
      )}
      {brain?.specialist?.handoffSummary && (
        <p className="text-xs text-muted-foreground/80 mb-2">{brain.specialist.handoffSummary}</p>
      )}
    </>
  );
}
