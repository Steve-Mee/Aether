import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardContent, Skeleton } from '@/components/ui';
import { autonomyAccentClass, defaultExecuteLabel } from '@/lib/actionAutonomy';
import { resolveMerchantExecutionModeFromResult } from '@/lib/settings/applyMerchantAutonomy';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import type { DemoCommandResponse, DemoIntentId } from '@/lib/localIntentMatcher';
import { intentLabel } from '@/lib/localIntentMatcher';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import {
  AutonomyModeBadge,
  CompoundStepTimeline,
  ConfidenceHero,
  IntentPill,
  MetricBlock,
  MetricZone,
  StatChip,
  StepProgressRail,
} from './primitives';
import DemoExplainSheet from './DemoExplainSheet';

const AUTO_EXEC_DELAY_MS = 320;

interface CommandDemoResponseProps {
  response: DemoCommandResponse | null;
  loading?: boolean;
  loadingPhase?: string;
  loadingProgress?: number;
  stepIndex?: number;
  stepTotal?: number;
  autoExecuteTrigger?: number;
  onAdjust?: (command: string) => void;
  onExecute?: () => void;
  onUndo?: (intentId: DemoIntentId) => void;
  onAutoExecuteComplete?: (intentId: DemoIntentId) => void;
  approvalConfirmedIntentId?: DemoIntentId | null;
  onDismiss?: () => void;
}

export default function CommandDemoResponse({
  response,
  loading,
  loadingPhase = 'AETHER analyseert je commando…',
  loadingProgress = 0,
  stepIndex = 0,
  stepTotal = 0,
  onAdjust,
  autoExecuteTrigger = 0,
  onExecute,
  onUndo,
  onAutoExecuteComplete,
  approvalConfirmedIntentId,
  onDismiss,
}: CommandDemoResponseProps) {
  const { settings } = useMerchantSettings();
  const [executed, setExecuted] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [undone, setUndone] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);

  useEffect(() => {
    setExecuted(false);
    setExecuting(false);
    setUndone(false);
    setExplainOpen(false);
  }, [response?.originalCommand, response?.intentId]);

  const runAutonomousExecute = useCallback(() => {
    if (!response) return;
    const mode = resolveMerchantExecutionModeFromResult(settings, response);
    if (mode !== 'autonomous') return;
    setExecuting(true);
    window.setTimeout(() => {
      setExecuting(false);
      setExecuted(true);
      onAutoExecuteComplete?.(response.intentId);
    }, AUTO_EXEC_DELAY_MS);
  }, [response, onAutoExecuteComplete, settings]);

  useEffect(() => {
    if (autoExecuteTrigger > 0 && response && !executed && !executing) {
      runAutonomousExecute();
    }
  }, [autoExecuteTrigger, response, executed, executing, runAutonomousExecute]);

  useEffect(() => {
    if (approvalConfirmedIntentId && response?.intentId === approvalConfirmedIntentId) {
      setExecuted(true);
    }
  }, [approvalConfirmedIntentId, response?.intentId]);

  if (loading) {
    return (
      <Card
        className="mt-4 rounded-2xl border-border/25 bg-card/50 insight-card-shadow"
        data-testid="command-demo-loading"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Sparkles size={14} className="text-muted-foreground shrink-0" aria-hidden />
            <p key={loadingPhase} className="text-sm text-muted-foreground animate-fade-in">
              {loadingPhase}
            </p>
          </div>
          <Skeleton className="h-4 w-full max-w-md" variant="text" />
          <Skeleton className="h-3 w-2/3" variant="text" />
          {stepTotal > 1 && <StepProgressRail stepIndex={stepIndex} stepTotal={stepTotal} />}
          <div className="h-0.5 w-full overflow-hidden rounded-full bg-muted/30">
            <div
              className="h-full rounded-full bg-primary/60 transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, loadingProgress)}%` }}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!response) return null;

  const executionMode = resolveMerchantExecutionModeFromResult(settings, response);
  const showMetric = response.metricLabel && response.metricValue;
  const showConfidence =
    response.intentId !== 'UNKNOWN' &&
    typeof response.confidence === 'number' &&
    response.confidence >= 0.75;
  const isConfidenceMetric = showMetric && response.metricLabel?.toLowerCase() === 'confidence';
  const showMetricInZone = showMetric && !(showConfidence && isConfidenceMetric);
  const isSummaryVariant = response.responseVariant === 'summary';
  const accentClass = autonomyAccentClass(executionMode);
  const showPrimaryExecute = response.intentId !== 'UNKNOWN';

  const executeLabel =
    response.executeLabel ??
    (response.intentId === 'BUSINESS_SUMMARY' || response.intentId === 'MARGIN_INSIGHT'
      ? (response.executeLabel ?? 'Bekijk in Insights')
      : defaultExecuteLabel(executionMode));

  const handleExecute = () => {
    if (executionMode === 'autonomous') {
      runAutonomousExecute();
      return;
    }
    if (executionMode === 'approval_required') {
      onExecute?.();
      return;
    }
    setExecuted(true);
    onExecute?.();
  };

  const handleAdjust = () => {
    onAdjust?.(response.originalCommand ?? '');
  };

  return (
    <>
      <Card
        className={cn(
          'mt-4 rounded-2xl bg-card/55 insight-card-shadow animate-fade-in',
          accentClass,
        )}
        data-testid="command-demo-response"
        data-execution-mode={executionMode}
        role="status"
        aria-live="polite"
      >
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-widest text-caption-accessible flex items-center gap-1.5">
              <Sparkles size={12} />
              AETHER
            </p>
            <AutonomyModeBadge mode={executionMode} />
            {showConfidence && (
              <IntentPill
                label={intentLabel(response.intentId)}
                confidence={response.confidence!}
                className="mb-1"
              />
            )}
            <p className="text-sm font-medium text-foreground">{response.preparedHeadline}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{response.result}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{response.summary}</p>
          </div>

          {isSummaryVariant && showMetric ? (
            <MetricZone className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
              <ConfidenceHero value={response.metricValue!} label={response.metricLabel} />
              {response.impactValue && response.impactLabel && (
                <MetricBlock label={response.impactLabel} value={response.impactValue} size="lg" />
              )}
              {response.secondaryMetrics?.map((metric) => (
                <MetricBlock
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  size="lg"
                />
              ))}
            </MetricZone>
          ) : (
            (showMetricInZone || response.impactValue) && (
              <MetricZone>
                {showMetricInZone && (
                  <ConfidenceHero value={response.metricValue!} label={response.metricLabel} />
                )}
                {response.impactValue && response.impactLabel && (
                  <MetricBlock
                    label={response.impactLabel}
                    value={response.impactValue}
                    align="right"
                    size="lg"
                  />
                )}
              </MetricZone>
            )
          )}

          {response.compoundSteps && response.compoundSteps.length > 0 && (
            <CompoundStepTimeline steps={response.compoundSteps} />
          )}

          {response.highlights.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-border/20 pt-3">
              {response.highlights.slice(0, 3).map((line) => (
                <StatChip key={line}>{line}</StatChip>
              ))}
            </div>
          )}

          {executing && (
            <div className="flex items-center gap-2 rounded-xl border border-border/25 bg-muted/15 px-3 py-2.5 animate-fade-in">
              <Loader2 size={16} className="text-muted-foreground shrink-0 animate-spin" />
              <p className="text-sm text-muted-foreground">AETHER voert uit…</p>
            </div>
          )}

          {executed && !undone && response.executionConfirmation && (
            <div
              className="flex items-center gap-2 rounded-xl border border-success/20 bg-success/5 px-3 py-2.5 motion-safe:animate-fade-in"
              data-testid="command-execute-confirmation"
            >
              <CheckCircle2 size={16} className="text-success shrink-0" />
              <p className="text-sm text-foreground">{response.executionConfirmation}</p>
            </div>
          )}

          {undone && (
            <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-muted/15 px-3 py-2.5 animate-fade-in">
              <p className="text-sm text-muted-foreground">{t('commandCenter.response.undone')}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {showPrimaryExecute && !undone && (
              <Button
                size="sm"
                className="h-9 rounded-lg"
                disabled={executed || executing}
                onClick={handleExecute}
              >
                {executed ? 'Uitgevoerd' : executing ? 'Bezig…' : executeLabel}
              </Button>
            )}
            {executed && response.undoable && !undone && (
              <Button
                size="sm"
                variant="outline"
                className="h-9 rounded-lg"
                data-testid="command-undo-button"
                onClick={() => {
                  setUndone(true);
                  setExecuted(false);
                  onUndo?.(response.intentId);
                }}
              >
                {t('commandCenter.response.undo')}
                {response.undoWindowLabel ? ` (${response.undoWindowLabel})` : ''}
              </Button>
            )}
            {!executed && (
              <Button size="sm" variant="premium" className="h-9 rounded-lg" onClick={handleAdjust}>
                Aanpassen
              </Button>
            )}
            {executed && !undone && (
              <Button size="sm" variant="premium" className="h-9 rounded-lg" onClick={handleAdjust}>
                Aanpassen
              </Button>
            )}
            <Button
              size="sm"
              variant="premium"
              className="h-9 rounded-lg"
              onClick={() => setExplainOpen(true)}
            >
              Uitleg
            </Button>
            {executionMode === 'approval_required' && !executed && (
              <Button
                size="sm"
                variant="ghost"
                className="h-9 rounded-lg text-muted-foreground"
                onClick={onDismiss}
              >
                Weigeren
              </Button>
            )}
            {executionMode !== 'approval_required' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-9 rounded-lg text-muted-foreground"
                onClick={onDismiss}
              >
                Sluiten
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <DemoExplainSheet
        open={explainOpen}
        intentId={response.intentId}
        onClose={() => setExplainOpen(false)}
      />
    </>
  );
}
