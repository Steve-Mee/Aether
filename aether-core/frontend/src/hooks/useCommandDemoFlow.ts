import { useCallback, useRef, useState } from 'react';
import { env } from '@/lib/config/env';
import { toUserMessage } from '@/lib/api/errors';
import { useCommand } from '@/lib/CommandContext';
import { resolveMerchantExecutionModeFromResult } from '@/lib/settings/applyMerchantAutonomy';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import { parseCompoundCommand } from '@/lib/compoundCommandParser';
import type { SuggestionBuildInput } from '@/lib/commandSuggestionContext';
import type { CommandResult } from '@/types/command';
import {
  buildDemoResponse,
  detectIntent,
  getCompoundStepLoadingPhases,
  getLoadingPhases,
  intentToLinkedInsight,
  type DemoCommandResponse,
  type DemoIntentId,
  type LinkedInsightId,
} from '@/lib/localIntentMatcher';

const PHASE_DELAY_MS = 220;

export interface UseCommandDemoFlowOptions {
  suggestionContext?: SuggestionBuildInput | null;
  onCommandComplete?: (
    linkedInsightId: LinkedInsightId,
    intentId: DemoIntentId,
    response: DemoCommandResponse,
  ) => void;
  onIntentClear?: () => void;
  onExecute?: (intentId: DemoIntentId) => void;
  onApprovalRequest?: (response: DemoCommandResponse) => void;
}

/** Minimal DemoCommandResponse shape from a live API result — no demo UI overlay. */
function apiResultToDisplayResponse(
  apiResult: CommandResult,
  command: string,
  intentOverride?: DemoIntentId,
): DemoCommandResponse {
  const intentId = intentOverride ?? detectIntent(command).id;
  return {
    ...apiResult,
    intentId,
    summary: apiResult.brain?.summary?.narrative ?? '',
    highlights: [],
    preparedHeadline: apiResult.parsedIntent || 'Resultaat',
    linkedInsightId: intentToLinkedInsight(intentId),
  };
}

export function useCommandDemoFlow({
  suggestionContext = null,
  onCommandComplete,
  onIntentClear,
  onExecute,
  onApprovalRequest,
}: UseCommandDemoFlowOptions) {
  const { settings } = useMerchantSettings();
  const { executeCommand } = useCommand();
  const [demoLoading, setDemoLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepTotal, setStepTotal] = useState(0);
  const [demoResult, setDemoResult] = useState<DemoCommandResponse | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  const clearDemoState = useCallback(() => {
    setDemoResult(null);
    setDemoError(null);
    setDemoLoading(false);
    setLoadingPhase('');
    setLoadingProgress(0);
    setStepIndex(0);
    setStepTotal(0);
  }, []);

  const runPhases = useCallback(async (phases: string[]) => {
    for (let i = 0; i < phases.length; i++) {
      setLoadingPhase(phases[i]!);
      setLoadingProgress(((i + 1) / phases.length) * 100);
      await new Promise((r) => setTimeout(r, PHASE_DELAY_MS));
    }
  }, []);

  const runDemoOnly = useCallback(
    async (trimmed: string, intentOverride?: DemoIntentId) => {
      const compound = !intentOverride ? parseCompoundCommand(trimmed) : null;

      if (compound && compound.steps.length >= 2) {
        setStepTotal(compound.steps.length);
        for (let si = 0; si < compound.steps.length; si++) {
          setStepIndex(si + 1);
          const step = compound.steps[si]!;
          const phases = getCompoundStepLoadingPhases(si, compound.steps.length, step.intentId);
          await runPhases(phases);
        }
        const response = buildDemoResponse(trimmed, undefined, suggestionContext);
        setDemoResult(response);
        onCommandComplete?.(response.linkedInsightId, response.intentId, response);
      } else {
        const intent = intentOverride ? { id: intentOverride } : { id: detectIntent(trimmed).id };
        const phases = getLoadingPhases(intent.id);
        setStepTotal(0);
        setStepIndex(0);
        await runPhases(phases);
        const response = buildDemoResponse(trimmed, intentOverride, suggestionContext);
        setDemoResult(response);
        onCommandComplete?.(response.linkedInsightId, response.intentId, response);
      }
    },
    [onCommandComplete, runPhases, suggestionContext],
  );

  const runCommand = useCallback(
    async (text: string, intentOverride?: DemoIntentId) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      setDemoLoading(true);
      setDemoResult(null);
      setDemoError(null);
      setLoadingProgress(0);
      onIntentClear?.();

      const intent = intentOverride ? { id: intentOverride } : { id: detectIntent(trimmed).id };
      const phases = getLoadingPhases(intent.id);
      setStepTotal(0);
      setStepIndex(0);
      await runPhases(phases.slice(0, 2));

      try {
        const apiResult = await executeCommand(trimmed);
        const response = env.isMockMode
          ? buildDemoResponse(trimmed, intentOverride, suggestionContext)
          : apiResultToDisplayResponse(apiResult, trimmed, intentOverride);
        await runPhases(phases.slice(2));
        setDemoResult(response);
        onCommandComplete?.(response.linkedInsightId, response.intentId, response);
      } catch (err) {
        if (env.isLiveMode && env.liveDemo) {
          await runPhases(phases.slice(2));
          await runDemoOnly(trimmed, intentOverride);
        } else {
          setDemoError(toUserMessage(err));
        }
      }

      setDemoLoading(false);
      setStepIndex(0);
      setStepTotal(0);
      window.setTimeout(() => {
        responseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    },
    [executeCommand, onCommandComplete, onIntentClear, runDemoOnly, runPhases, suggestionContext],
  );

  const handleDismiss = useCallback(() => {
    clearDemoState();
    onIntentClear?.();
  }, [clearDemoState, onIntentClear]);

  const requestExecute = useCallback(() => {
    if (!demoResult) return;
    const mode = resolveMerchantExecutionModeFromResult(settings, demoResult);
    if (mode === 'approval_required') {
      onApprovalRequest?.(demoResult);
      return;
    }
    onExecute?.(demoResult.intentId);
  }, [demoResult, onApprovalRequest, onExecute, settings]);

  const handleExecute = requestExecute;

  return {
    demoLoading,
    loadingPhase,
    loadingProgress,
    stepIndex,
    stepTotal,
    demoResult,
    demoError,
    responseRef,
    runCommand,
    clearDemoState,
    handleDismiss,
    handleExecute,
  };
}
