import { Link } from 'react-router-dom';
import React from 'react';
import type { CommandResult } from '../../lib/CommandContext';
import { Button, Card, ConfidenceBadge, ErrorState, RiskBadge } from '@/components/ui';
import { routeForIntent } from '../../lib/intentNavigation';
import { t } from '../../lib/i18n';
import { COMMAND_PREFILL_STORAGE_KEY } from './NaturalLanguageBar';

interface CommandResultCardProps {
  result: CommandResult;
  onAdjust?: (command: string) => void;
  onRetry?: () => void;
  onUndo?: () => void;
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

  return (
    <Card
      padding="sm"
      className="rounded-xl border-border/30 bg-card/50 insight-card-shadow animate-fade-in"
      data-testid="command-api-response"
    >
      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/65 mb-2">
        AETHER
      </p>
      <p className="text-sm font-medium text-foreground">{preparedHeadline(result.parsedIntent)}</p>
      <p className="mt-1.5 text-sm text-foreground/90 leading-relaxed">{result.result}</p>
      {result.parsedIntent !== 'UNKNOWN' && (
        <p className="mt-1 text-xs text-muted-foreground/75 leading-relaxed">
          {t('command.result.summaryHint')}
        </p>
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
