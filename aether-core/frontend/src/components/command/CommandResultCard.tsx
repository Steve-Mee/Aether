import { useState } from 'react';
import type { CommandResult } from '@/lib/CommandContext';
import { Button, Card, ErrorState } from '@/components/ui';
import AgentExplainabilitySheet from '@/components/explainability/AgentExplainabilitySheet';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import { t } from '@/lib/i18n';
import CommandResultHeader from './CommandResultHeader';
import CommandResultBrainNotices from './CommandResultBrainNotices';
import CommandResultRunBody from './CommandResultRunBody';
import CommandResultActions, { inferRisk } from './CommandResultActions';
import { preparedHeadline } from './commandResultCard.helpers';
import { useAgentRunPoll } from './useAgentRunPoll';

interface CommandResultCardProps {
  result: CommandResult;
  onAdjust?: (command: string) => void;
  onRetry?: () => void;
  onUndo?: () => void;
  autoExecutedIds?: Set<string>;
}

export default function CommandResultCard({
  result,
  onAdjust,
  onRetry,
  onUndo,
  autoExecutedIds,
}: CommandResultCardProps) {
  const isError = result.parsedIntent === 'ERROR';
  const { settings } = useMerchantSettings();
  const [explainOpen, setExplainOpen] = useState(false);
  const showExplain =
    settings.explainabilityPrefs.detailLevel !== 'off' &&
    Boolean(result.commandId ?? result.brain?.explainabilityId);
  const showFlowDiagram =
    settings.explainabilityPrefs.detailLevel === 'extended' &&
    (result.brain?.handoffChain?.length ?? 0) > 1;

  const { isCheckpoint, awaitingApprovalId, agentTranscript } = useAgentRunPoll(result);
  const brain = result.brain;
  const executedSet =
    autoExecutedIds ?? new Set(brain?.autoExecuted?.map((a) => a.proposalId) ?? []);

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

  return (
    <Card
      padding="sm"
      className="rounded-xl border-border/30 bg-card/50 insight-card-shadow animate-fade-in"
      data-testid="command-api-response"
    >
      <CommandResultHeader result={result} showFlowDiagram={showFlowDiagram} />
      <p className="text-sm font-medium text-foreground">{preparedHeadline(result.parsedIntent)}</p>
      <p className="mt-1.5 text-sm text-foreground/90 leading-relaxed">{result.result}</p>
      {showExplain && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setExplainOpen(true)}
          data-testid="command-explain-button"
        >
          {t('explain.details')}
        </Button>
      )}
      {result.parsedIntent !== 'UNKNOWN' && (
        <p className="mt-1 text-xs text-muted-foreground/75 leading-relaxed">
          {t('command.result.summaryHint')}
        </p>
      )}
      <CommandResultBrainNotices result={result} />
      <CommandResultRunBody
        result={result}
        isCheckpoint={isCheckpoint}
        awaitingApprovalId={awaitingApprovalId}
        agentTranscript={agentTranscript}
        executedSet={executedSet}
      />
      <CommandResultActions result={result} risk={risk} onAdjust={onAdjust} onUndo={onUndo} />
      {showExplain && result.commandId && (
        <AgentExplainabilitySheet
          entityType="command"
          entityId={result.commandId}
          open={explainOpen}
          onClose={() => setExplainOpen(false)}
        />
      )}
    </Card>
  );
}
