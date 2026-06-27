import { Link } from 'react-router-dom';
import { approvalDetail } from '@/lib/navigation/moduleLinks';
import { useState } from 'react';
import { Button, Card, ConfidenceBadge, RiskBadge } from '@/components/ui';
import type { CommandResult } from '@/types/command';
import { commandsApi } from '@/features/commands/api';
import { t } from '@/lib/i18n';

type PendingAction = NonNullable<CommandResult['brain']>['pendingActions'] extends (infer T)[] | undefined
  ? T
  : never;

interface BrainToolProposalCardProps {
  action: PendingAction;
  commandId?: string;
  autoExecuted?: boolean;
  onExecuted?: (message: string) => void;
  onRejected?: () => void;
}

export default function BrainToolProposalCard({
  action,
  commandId,
  autoExecuted,
  onExecuted,
  onRejected,
}: BrainToolProposalCardProps) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const routedToInbox = Boolean(action.approvalId);
  const showDirectExecute = !autoExecuted && !routedToInbox;

  const execute = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const result = await commandsApi.executeToolProposal(action.proposalId, commandId);
      if (result.success) {
        setFeedback({ kind: 'success', message: result.message });
        onExecuted?.(result.message);
      } else {
        setFeedback({ kind: 'error', message: result.message });
      }
    } catch (err) {
      setFeedback({
        kind: 'error',
        message: err instanceof Error ? err.message : t('command.brain.toolExecuteFailed'),
      });
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  const reject = async () => {
    setLoading(true);
    try {
      await commandsApi.rejectToolProposal(action.proposalId);
      setFeedback({ kind: 'success', message: t('command.brain.toolRejected') });
      onRejected?.();
    } catch {
      setFeedback({ kind: 'error', message: t('command.brain.toolRejectFailed') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      padding="sm"
      className="mt-3 rounded-lg border-primary/20 bg-primary/5"
      data-testid={`brain-tool-proposal-${action.proposalId}`}
    >
      <p className="text-xs font-medium text-foreground">
        {routedToInbox
          ? t('command.brain.approvalCreatedTitle')
          : t('command.brain.toolProposalTitle')}
      </p>
      <p className="mt-1 text-sm text-foreground/90 leading-relaxed">{action.summary}</p>

      {action.expectedImpact && (
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground/80">{t('command.brain.expectedImpact')}:</span>{' '}
          {action.expectedImpact}
        </p>
      )}
      {action.rationale && (
        <p className="mt-1 text-xs text-muted-foreground/90 leading-relaxed italic">
          {action.rationale}
        </p>
      )}
      {action.learnedHint && (
        <p className="mt-1 text-xs text-muted-foreground/80 italic">{action.learnedHint}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-2">
        <RiskBadge band={action.risk} />
        {action.confidence != null && <ConfidenceBadge confidence={action.confidence} />}
        <span className="text-[10px] font-mono text-muted-foreground/60">{action.tool}</span>
        {autoExecuted && (
          <span className="text-[10px] text-success font-medium">{t('command.brain.autoExecutedBadge')}</span>
        )}
        {action.requiresApproval && !autoExecuted && !routedToInbox && (
          <span className="text-[10px] text-amber-600">{t('command.brain.approvalRequired')}</span>
        )}
        {routedToInbox && (
          <span className="text-[10px] text-primary font-medium">{t('command.brain.inInbox')}</span>
        )}
      </div>

      {feedback && (
        <p
          className={`mt-2 text-xs ${feedback.kind === 'success' ? 'text-success' : 'text-destructive'}`}
          role="status"
        >
          {feedback.message}
        </p>
      )}

      {!feedback?.kind && !autoExecuted && (
        <div className="flex flex-wrap gap-2 mt-3">
          {routedToInbox ? (
            <Button size="sm" variant="primary" asChild>
              <Link to={approvalDetail(action.approvalId!)}>{t('command.brain.viewApproval')}</Link>
            </Button>
          ) : showDirectExecute && confirmOpen && action.risk === 'high' ? (
            <>
              <Button size="sm" variant="primary" disabled={loading} onClick={execute}>
                {loading ? t('command.brain.executing') : t('command.brain.confirmExecute')}
              </Button>
              <Button size="sm" variant="ghost" disabled={loading} onClick={() => setConfirmOpen(false)}>
                {t('command.brain.cancel')}
              </Button>
            </>
          ) : showDirectExecute ? (
            <>
              <Button
                size="sm"
                variant="primary"
                disabled={loading}
                onClick={() => (action.risk === 'high' ? setConfirmOpen(true) : execute())}
              >
                {loading ? t('command.brain.executing') : t('command.brain.executeNow')}
              </Button>
              <Button size="sm" variant="outline" disabled={loading} onClick={reject}>
                {t('command.brain.reject')}
              </Button>
            </>
          ) : null}
        </div>
      )}
    </Card>
  );
}
