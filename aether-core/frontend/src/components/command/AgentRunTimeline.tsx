import { CompoundStepTimeline, StepProgressRail } from '@/components/command-center/primitives';
import type { AgentMessage } from '@/types/command';
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

export default function AgentRunTimeline({
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
    <div className="mt-3" data-testid="agent-run-timeline">
      <p className="text-xs font-medium text-muted-foreground mb-2">{t('command.brain.agentSteps')}</p>
      {goal && total != null && total > 0 && (
        <div className="mb-2 space-y-1">
          <p className="text-xs text-muted-foreground">{goal}</p>
          <StepProgressRail stepIndex={steps.filter((s) => s.done).length} stepTotal={total} />
        </div>
      )}
      <CompoundStepTimeline steps={steps} />
    </div>
  );
}
