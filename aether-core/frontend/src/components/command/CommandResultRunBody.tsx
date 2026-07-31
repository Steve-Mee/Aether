import { Link } from 'react-router-dom';
import { useState } from 'react';
import type { CommandResult } from '@/lib/CommandContext';
import type { AgentMessage } from '@/types/command';
import BrainToolProposalCard from './BrainToolProposalCard';
import AgentRunTimeline from './AgentRunTimeline';
import { t } from '@/lib/i18n';
import { approvalDetail } from '@/lib/navigation/moduleLinks';

interface CommandResultRunBodyProps {
  result: CommandResult;
  isCheckpoint: boolean;
  awaitingApprovalId?: string;
  agentTranscript?: AgentMessage[];
  executedSet: Set<string>;
}

export default function CommandResultRunBody({
  result,
  isCheckpoint,
  awaitingApprovalId,
  agentTranscript,
  executedSet,
}: CommandResultRunBodyProps) {
  const brain = result.brain;
  const [contextOpen, setContextOpen] = useState(false);

  return (
    <>
      {brain?.actionProposal && (
        <p className="mt-2 text-xs text-primary/90 leading-relaxed">
          <span className="font-medium">{t('command.brain.proposal')}:</span> {brain.actionProposal}
        </p>
      )}

      {brain?.error && (
        <p className="mt-2 text-xs text-amber-600/90 leading-relaxed" role="status">
          {t('command.brain.retrievalWarning')} ({brain.error})
        </p>
      )}

      {brain?.contextSnippets && brain.contextSnippets.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setContextOpen((o) => !o)}
            aria-expanded={contextOpen}
          >
            {t('command.brain.contextUsed')} ({brain.recallCount ?? brain.contextSnippets.length})
            {contextOpen ? ' ▾' : ' ▸'}
          </button>
          {contextOpen && (
            <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground/80 font-mono leading-relaxed">
              {brain.contextSnippets.map((snippet, i) => {
                const match = brain.recallMatches?.[i];
                return (
                  <li key={i} className="truncate" title={snippet}>
                    • {snippet}
                    {match != null && (
                      <span className="ml-1 text-muted-foreground/50">
                        ({match.score.toFixed(2)})
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {brain?.summary && (
        <div className="mt-3 rounded-lg border border-border/30 bg-muted/10 px-3 py-2 text-xs">
          <p className="font-medium text-foreground">{t('command.brain.runSummary')}</p>
          <p className="mt-1 text-muted-foreground leading-relaxed">{brain.summary.narrative}</p>
          {brain.summary.completedSteps.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 text-muted-foreground">
              {brain.summary.completedSteps.map((step, i) => (
                <li key={i}>
                  ✓ {step.label}
                  {step.tool ? ` (${step.tool})` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isCheckpoint && (
        <div
          className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200"
          data-testid="agent-checkpoint-banner"
        >
          <p className="font-medium">{t('command.brain.agentAwaitingApproval')}</p>
          {awaitingApprovalId && (
            <Link
              to={approvalDetail(awaitingApprovalId)}
              className="mt-1 inline-block text-primary underline underline-offset-2"
            >
              {t('command.brain.viewApproval')}
            </Link>
          )}
        </div>
      )}

      {agentTranscript && agentTranscript.length > 0 && (
        <AgentRunTimeline
          transcript={agentTranscript}
          agentTranscripts={brain?.agentTranscripts}
          executionMode={brain?.executionMode}
          checkpoint={isCheckpoint}
          planGoal={brain?.plan?.goal}
          planStepTotal={brain?.plan?.steps.length}
        />
      )}
      {!agentTranscript?.length && brain?.agentTranscripts && (
        <AgentRunTimeline
          agentTranscripts={brain.agentTranscripts}
          executionMode={brain.executionMode}
          checkpoint={isCheckpoint}
        />
      )}

      {brain?.autoExecuted && brain.autoExecuted.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-success/90">
          {brain.autoExecuted.map((item) => (
            <li key={item.proposalId}>
              {t('command.brain.autoExecuted')}: {item.result}
            </li>
          ))}
        </ul>
      )}

      {brain?.pendingActions && brain.pendingActions.length > 0 && (
        <div className="mt-3 space-y-2">
          {brain.pendingActions.map((action) => (
            <BrainToolProposalCard
              key={action.proposalId}
              action={action}
              commandId={result.commandId}
              autoExecuted={executedSet.has(action.proposalId)}
            />
          ))}
        </div>
      )}

      {brain?.toolTrace && brain.toolTrace.length > 0 && (
        <details className="mt-2 text-xs text-muted-foreground/75">
          <summary className="cursor-pointer font-medium">
            {t('command.brain.toolsUsed')} ({brain.toolTrace.length})
          </summary>
          <ul className="mt-1 space-y-1 pl-2">
            {brain.toolTrace.map((entry, i) => (
              <li key={i}>
                {entry.tool}
                {entry.status ? ` — ${entry.status}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
