import { Link } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import type { CommandResult } from '../../lib/CommandContext';
import type { AgentRunResponse } from '@/types/command';
import { Button, Card, ConfidenceBadge, ErrorState, RiskBadge } from '@/components/ui';
import BrainToolProposalCard from './BrainToolProposalCard';
import AgentRunTimeline from './AgentRunTimeline';
import AgentBadge from './AgentBadge';
import HandoffChainRail, { executionModeBadgeLabel } from './HandoffChainRail';
import AgentContributionsPanel from './AgentContributionsPanel';
import { agentDisplayLabel } from '@/lib/agentDisplay';
import { routeForIntent } from '../../lib/intentNavigation';
import { t } from '../../lib/i18n';
import { COMMAND_PREFILL_STORAGE_KEY } from './NaturalLanguageBar';
import { approvalDetail } from '@/lib/navigation/moduleLinks';
import { commandsRepository } from '@/lib/data/repositories/commandsRepository';

interface CommandResultCardProps {
  result: CommandResult;
  onAdjust?: (command: string) => void;
  onRetry?: () => void;
  onUndo?: () => void;
  autoExecutedIds?: Set<string>;
}

const INFORM_ONLY_INTENTS = new Set([
  'MARGIN_INSIGHT',
  'BUSINESS_SUMMARY',
  'INSIGHTS_OVERVIEW',
  'FORECAST',
  'OUTCOMES_REPORT',
  'EMAIL_SUMMARY',
  'LOW_MARGIN_REPORT',
  'INVENTORY_STATUS',
  'ORDER_STATUS',
]);

function inferRisk(confidence: number, requiresApproval?: boolean): 'low' | 'medium' | 'high' {
  if (resultRequiresApproval(requiresApproval, confidence)) {
    return confidence >= 0.8 ? 'medium' : 'high';
  }
  return confidence >= 0.85 ? 'low' : confidence >= 0.6 ? 'medium' : 'high';
}

function resultRequiresApproval(requiresApproval?: boolean, confidence?: number): boolean {
  if (requiresApproval != null) return requiresApproval;
  return (confidence ?? 0) < 0.85;
}

function preparedHeadline(intent: string): string {
  if (intent === 'UNKNOWN' || intent === 'ERROR') {
    return t('command.result.headline.unknown');
  }
  return t('command.result.headline.ready');
}

function openCommandCenterPrefill(command: string) {
  sessionStorage.setItem(COMMAND_PREFILL_STORAGE_KEY, command);
}

export default function CommandResultCard({
  result,
  onAdjust,
  onRetry,
  onUndo,
  autoExecutedIds,
}: CommandResultCardProps) {
  const isError = result.parsedIntent === 'ERROR';

  if (isError) {
    return (
      <ErrorState
        message={result.result}
        onRetry={onRetry}
        className="rounded-xl insight-card-shadow"
        data-testid="command-api-response"
      />
    );
  }

  const risk = result.riskBand ?? inferRisk(result.confidence, result.requiresApproval);
  const route = routeForIntent(result.parsedIntent);
  const isInformOnly =
    INFORM_ONLY_INTENTS.has(result.parsedIntent) ||
    (!result.requiresApproval && result.riskBand === 'low' && !route);
  const originalCommand = result.originalCommand ?? '';
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
  const [contextOpen, setContextOpen] = useState(false);
  const [liveAgentRun, setLiveAgentRun] = useState<AgentRunResponse | null>(null);
  const executedSet =
    autoExecutedIds ??
    new Set(brain?.autoExecuted?.map((a) => a.proposalId) ?? []);

  const isCheckpoint = Boolean(
    liveAgentRun?.checkpoint ??
      brain?.checkpoint ??
      (liveAgentRun?.status === 'awaiting_approval' || brain?.runStatus === 'awaiting_approval')
  );
  const awaitingApprovalId =
    liveAgentRun?.awaitingApprovalId ?? brain?.awaitingApprovalId;
  const agentTranscript = liveAgentRun?.transcript ?? brain?.transcript;

  useEffect(() => {
    const shouldPoll =
      brain?.runStatus === 'running' ||
      brain?.checkpoint ||
      brain?.runStatus === 'awaiting_approval';

    if (!result.commandId || !shouldPoll) {
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const run = await commandsRepository.agentRun(result.commandId!);
        if (cancelled) return;
        setLiveAgentRun(run);
        if (run.status === 'awaiting_approval' || run.status === 'running') {
          timer = setTimeout(poll, 4000);
        }
      } catch {
        // Polling is best-effort
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [result.commandId, brain?.checkpoint, brain?.runStatus]);

  return (
    <Card
      padding="sm"
      className="rounded-xl border-border/30 bg-card/50 insight-card-shadow animate-fade-in"
      data-testid="command-api-response"
    >
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
            chainFrom={
              brain?.handoffChain?.find((h) => h.to === agent.agentKey)?.from
            }
          />
        ))}
      </div>
      {brain?.handoffChain && brain.handoffChain.length > 0 && (
        <HandoffChainRail chain={brain.handoffChain} />
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
      <p className="text-sm font-medium text-foreground">{preparedHeadline(result.parsedIntent)}</p>
      <p className="mt-1.5 text-sm text-foreground/90 leading-relaxed">{result.result}</p>
      {result.parsedIntent !== 'UNKNOWN' && (
        <p className="mt-1 text-xs text-muted-foreground/75 leading-relaxed">
          {t('command.result.summaryHint')}
        </p>
      )}

      {brain?.globalKnowledge?.message && (
        <p className="mt-2 text-xs text-emerald-700/90 dark:text-emerald-400/90 leading-relaxed" role="status">
          {brain.globalKnowledge.message}
        </p>
      )}

      {brain?.memoryNotice && (
        <p
          className="mt-2 text-xs text-sky-700/90 dark:text-sky-400/90 leading-relaxed"
          role="status"
          data-testid="brain-memory-notice"
        >
          {brain.memoryNotice}
        </p>
      )}

      {brain?.reflectionNotice && (
        <p
          className="mt-2 text-xs text-violet-700/90 dark:text-violet-400/90 leading-relaxed"
          role="status"
          data-testid="brain-reflection-notice"
        >
          {brain.reflectionNotice}
        </p>
      )}

      {brain?.reflectionStored && (
        <p
          className="mt-2 text-xs text-emerald-700/90 dark:text-emerald-400/90 leading-relaxed"
          role="status"
          data-testid="brain-reflection-stored"
        >
          {brain.reflectionStored}
        </p>
      )}

      {brain?.memoryRecalled && brain.memoryRecalled.length > 0 && (
        <ul
          className="mt-2 space-y-1 text-xs text-muted-foreground/90"
          data-testid="brain-memory-recalled"
        >
          {brain.memoryRecalled.map((item, index) => (
            <li key={`${item.summary}-${index}`}>
              <span className="text-foreground/80">{item.summary}</span>
              {' · '}
              <span>{item.age}</span>
              {item.kind ?
                <>
                  {' · '}
                  <span className="uppercase tracking-wide text-primary/80">{item.kind}</span>
                </>
              : null}
            </li>
          ))}
        </ul>
      )}

      {brain?.knowledgeContributionNotice && (
        <p
          className="mt-2 text-xs text-muted-foreground/90 leading-relaxed"
          role="status"
          data-testid="knowledge-contribution-notice"
        >
          {brain.knowledgeContributionNotice}
        </p>
      )}

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
                      <span className="ml-1 text-muted-foreground/50">({match.score.toFixed(2)})</span>
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

      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border/20">
        <ConfidenceBadge confidence={result.confidence} />
        <RiskBadge band={risk} />
        <span className="text-[10px] font-mono text-muted-foreground/55">
          {result.parsedIntent}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {originalCommand && onAdjust && (
          <Button
            size="sm"
            variant="premium"
            className="h-8 rounded-lg transition-all duration-fast"
            onClick={() => onAdjust(originalCommand)}
          >
            {t('command.result.adjust')}
          </Button>
        )}
        {route && (
          <Button size="sm" variant="outline" className="h-8 rounded-lg" asChild>
            <Link to={route}>{t('command.result.viewModule')}</Link>
          </Button>
        )}
        {isInformOnly && (
          <Button size="sm" variant="outline" className="h-8 rounded-lg" asChild>
            <Link
              to="/command-center"
              onClick={() => {
                if (originalCommand) openCommandCenterPrefill(originalCommand);
              }}
            >
              {t('command.result.openCommandCenter')}
            </Link>
          </Button>
        )}
        {result.undoable && onUndo && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-lg transition-all duration-fast hover:border-primary/30"
            onClick={onUndo}
          >
            {t('commandCenter.response.undo')}
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-8 rounded-lg text-muted-foreground" asChild>
          <Link to="/command-center">{t('command.result.explain')}</Link>
        </Button>
      </div>
    </Card>
  );
}
