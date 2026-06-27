import { useState } from 'react';
import { CompoundStepTimeline, StepProgressRail } from '@/components/command-center/primitives';
import type { AgentMessage } from '@/types/command';
import { agentDisplayLabel } from '@/lib/agentDisplay';
import { t } from '@/lib/i18n';

function transcriptToSteps(
  messages: AgentMessage[],
  checkpoint?: boolean
): { label: string; summary: string; done: boolean; checkpoint?: boolean }[] {
  const steps: { label: string; summary: string; done: boolean; checkpoint?: boolean }[] = [];
  const lastProposalIndex = messages.reduce(
    (last, msg, i) => (msg.role === 'proposal' ? i : last),
    -1
  );

  messages.forEach((msg, i) => {
    if (msg.role === 'plan') {
      msg.steps.forEach((step) => {
        steps.push({
          label: `${step.index}. ${step.label}`,
          summary: step.toolHint ?? step.riskHint ?? '',
          done: false,
        });
      });
    } else if (msg.role === 'reflection') {
      steps.push({
        label: t('command.brain.reflection'),
        summary: msg.observation.slice(0, 120),
        done: true,
      });
    } else if (msg.role === 'tool') {
      steps.push({
        label: msg.tool,
        summary: msg.status === 'proposed' ? t('command.brain.stepProposed') : msg.output.slice(0, 120),
        done: msg.status !== 'error',
      });
    } else if (msg.role === 'proposal') {
      const isCheckpointStep = Boolean(checkpoint && i === lastProposalIndex);
      steps.push({
        label: msg.tool,
        summary: isCheckpointStep ? t('command.brain.stepAwaitingApproval') : msg.summary,
        done: !isCheckpointStep,
        checkpoint: isCheckpointStep,
      });
    } else if (msg.role === 'assistant' && msg.content.trim()) {
      steps.push({
        label: t('command.brain.stepAssistant'),
        summary: msg.content.slice(0, 120),
        done: true,
      });
    }
  });

  return steps;
}

function SingleAgentTimeline({
  transcript,
  checkpoint,
  planGoal,
  planStepTotal,
}: {
  transcript: AgentMessage[];
  checkpoint?: boolean;
  planGoal?: string;
  planStepTotal?: number;
}) {
  const planMessage = transcript.find((m) => m.role === 'plan');
  const steps = transcriptToSteps(transcript, checkpoint);
  if (steps.length === 0) return null;

  const goal = planGoal ?? (planMessage?.role === 'plan' ? planMessage.goal : undefined);
  const total =
    planStepTotal ?? (planMessage?.role === 'plan' ? planMessage.steps.length : undefined);

  return (
    <>
      {goal && total != null && total > 0 && (
        <div className="mb-2 space-y-1">
          <p className="text-xs text-muted-foreground">{goal}</p>
          <StepProgressRail stepIndex={steps.filter((s) => s.done).length} stepTotal={total} />
        </div>
      )}
      <CompoundStepTimeline steps={steps} />
    </>
  );
}

export default function AgentRunTimeline({
  transcript,
  agentTranscripts,
  executionMode,
  checkpoint,
  planGoal,
  planStepTotal,
}: {
  transcript?: AgentMessage[];
  agentTranscripts?: Record<string, AgentMessage[]>;
  executionMode?: 'single' | 'sequential' | 'parallel';
  checkpoint?: boolean;
  planGoal?: string;
  planStepTotal?: number;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groupedKeys =
    agentTranscripts && executionMode && executionMode !== 'single'
      ? Object.keys(agentTranscripts).filter((k) => (agentTranscripts[k]?.length ?? 0) > 0)
      : [];

  if (groupedKeys.length > 1) {
    return (
      <div className="mt-3 space-y-2" data-testid="agent-run-timeline-grouped">
        <p className="text-xs font-medium text-muted-foreground">{t('command.brain.agentSteps')}</p>
        {groupedKeys.map((agentKey) => {
          const messages = agentTranscripts![agentKey] ?? [];
          const isOpen = !collapsed[agentKey];
          return (
            <div
              key={agentKey}
              className="rounded-lg border border-border/30 bg-muted/5 px-3 py-2"
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setCollapsed((c) => ({ ...c, [agentKey]: !c[agentKey] }))}
                aria-expanded={isOpen}
              >
                <span>{agentDisplayLabel(agentKey)}</span>
                <span className="ml-auto text-[10px]">{isOpen ? '▾' : '▸'}</span>
              </button>
              {isOpen && (
                <div className="mt-2">
                  <SingleAgentTimeline transcript={messages} checkpoint={checkpoint} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const singleTranscript =
    transcript ?? (groupedKeys.length === 1 ? agentTranscripts?.[groupedKeys[0]] : undefined);
  if (!singleTranscript || singleTranscript.length === 0) return null;

  return (
    <div className="mt-3" data-testid="agent-run-timeline">
      <p className="text-xs font-medium text-muted-foreground mb-2">{t('command.brain.agentSteps')}</p>
      <SingleAgentTimeline
        transcript={singleTranscript}
        checkpoint={checkpoint}
        planGoal={planGoal}
        planStepTotal={planStepTotal}
      />
    </div>
  );
}
