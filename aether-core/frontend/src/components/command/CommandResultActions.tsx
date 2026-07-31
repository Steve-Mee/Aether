import { Link } from 'react-router-dom';
import type { CommandResult } from '@/lib/CommandContext';
import { Button, ConfidenceBadge, RiskBadge } from '@/components/ui';
import { routeForIntent } from '@/lib/intentNavigation';
import { t } from '@/lib/i18n';
import {
  INFORM_ONLY_INTENTS,
  inferRisk,
  openCommandCenterPrefill,
  resultRequiresApproval,
} from './commandResultCard.helpers';

interface CommandResultActionsProps {
  result: CommandResult;
  risk: 'low' | 'medium' | 'high';
  onAdjust?: (command: string) => void;
  onRetry?: () => void;
  onUndo?: () => void;
}

export default function CommandResultActions({
  result,
  risk,
  onAdjust,
  onUndo,
}: CommandResultActionsProps) {
  const route = routeForIntent(result.parsedIntent);
  const isInformOnly =
    INFORM_ONLY_INTENTS.has(result.parsedIntent) ||
    (!result.requiresApproval && result.riskBand === 'low' && !route);
  const originalCommand = result.originalCommand ?? '';

  return (
    <>
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
    </>
  );
}

export { inferRisk, resultRequiresApproval };
