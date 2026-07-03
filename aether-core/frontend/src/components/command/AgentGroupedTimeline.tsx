import { useMemo, useState } from 'react';
import { CompoundStepTimeline, StepProgressRail } from '@/components/command-center/primitives';
import type { CommandStreamPlan, CommandStreamStep } from '@/lib/useCommandStream';
import { agentDisplayLabel } from '@/lib/agentDisplay';
import { t } from '@/lib/i18n';

interface AgentGroupedTimelineProps {
  steps: CommandStreamStep[];
  plansByAgent?: Record<string, CommandStreamPlan>;
  executionMode?: 'single' | 'sequential' | 'parallel' | null;
}

function groupStepsByAgent(steps: CommandStreamStep[]): Map<string, CommandStreamStep[]> {
  const groups = new Map<string, CommandStreamStep[]>();
  for (const step of steps) {
    const key = step.agentKey ?? '_default';
    const list = groups.get(key) ?? [];
    list.push(step);
    groups.set(key, list);
  }
  return groups;
}

export default function AgentGroupedTimeline({
  steps,
  plansByAgent,
  executionMode,
}: AgentGroupedTimelineProps) {
  const grouped = useMemo(() => groupStepsByAgent(steps), [steps]);
  const agentKeys = useMemo(() => [...grouped.keys()].filter((k) => k !== '_default'), [grouped]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const showGrouped = executionMode !== 'single' && executionMode != null && agentKeys.length > 0;

  if (!showGrouped) {
    const flat = grouped.get('_default') ?? steps;
    if (flat.length === 0) return null;
    return <CompoundStepTimeline steps={flat} />;
  }

  return (
    <div className="space-y-2" data-testid="agent-grouped-timeline">
      {agentKeys.map((agentKey) => {
        const agentSteps = grouped.get(agentKey) ?? [];
        const plan = plansByAgent?.[agentKey];
        const isOpen = !collapsed[agentKey];
        const allDone = agentSteps.length > 0 && agentSteps.every((s) => s.done);
        const statusIcon = allDone ? '✓' : '●';

        return (
          <div key={agentKey} className="rounded-lg border border-border/30 bg-muted/5 px-3 py-2">
            <button
              type="button"
              className="flex w-full items-center gap-2 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setCollapsed((c) => ({ ...c, [agentKey]: !c[agentKey] }))}
              aria-expanded={isOpen}
            >
              <span aria-hidden>{statusIcon}</span>
              <span>{agentDisplayLabel(agentKey)}</span>
              <span className="ml-auto text-[10px]">{isOpen ? '▾' : '▸'}</span>
            </button>
            {isOpen && (
              <div className="mt-2 space-y-1.5">
                {plan && plan.stepTotal > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">{plan.goal}</p>
                    <StepProgressRail stepIndex={plan.currentStep} stepTotal={plan.stepTotal} />
                  </div>
                )}
                {agentSteps.length > 0 && <CompoundStepTimeline steps={agentSteps} />}
              </div>
            )}
          </div>
        );
      })}
      {(grouped.get('_default')?.length ?? 0) > 0 && (
        <CompoundStepTimeline steps={grouped.get('_default')!} />
      )}
    </div>
  );
}
