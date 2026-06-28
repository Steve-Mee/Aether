import { useCallback, useEffect, useMemo, useState } from 'react';
import React from 'react';
import { useCommand } from '../../lib/CommandContext';
import { announceAssertive, announceStatus } from '@/lib/a11y/announceBus';
import { useDashboard } from '@/lib/DashboardContext';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import { t } from '../../lib/i18n';
import { CommandBar, Button } from '@/components/ui';
import { useSmartCommandInput } from '@/hooks/useSmartCommandInput';
import { useRotatingPlaceholder } from '@/hooks/useRotatingPlaceholder';
import type { DemoSuggestion } from '@/lib/localIntentMatcher';
import { IntentPill, CompoundStepTimeline, StepProgressRail } from '@/components/command-center/primitives';
import CommandSuggestionsList from './CommandSuggestionsList';
import CommandResultCard from './CommandResultCard';
import CommandErrorCard from './CommandErrorCard';
import AgentBadge from './AgentBadge';
import HandoffChainRail, { executionModeBadgeLabel } from './HandoffChainRail';
import SharedMemoryRail from './SharedMemoryRail';
import { agentsWorkingParallelLabel } from './AgentContributionsPanel';
import LiveExplainPanel from '@/components/explainability/LiveExplainPanel';

export const COMMAND_PREFILL_STORAGE_KEY = 'aether_command_prefill';

export default function NaturalLanguageBar() {
  const {
    executeCommand,
    undoLastCommand,
    lastResult,
    loading,
    streaming,
    streamSteps,
    streamPlan,
    streamPlansByAgent,
    streamActiveAgentKeys,
    streamHandoffChain,
    streamSharedMemory,
    streamExecutionMode,
    streamChainFrom,
    streamLiveExplain,
    cancelStream,
    error,
    openPalette,
  } = useCommand();
  const { data: dashboard } = useDashboard();
  const { settings } = useMerchantSettings();
  const [optimistic, setOptimistic] = useState(false);

  useEffect(() => {
    if (lastResult?.result) {
      announceStatus(lastResult.result);
    }
  }, [lastResult]);

  useEffect(() => {
    if (error) {
      announceAssertive(error);
    }
  }, [error]);

  const contextInput = useMemo(
    () => ({ dashboard, todayReady: [], settings }),
    [dashboard, settings],
  );

  const runCommand = useCallback(
    async (cmd: string) => {
      setOptimistic(true);
      try {
        await executeCommand(cmd);
      } catch {
        // Error is surfaced via CommandContext.error
      } finally {
        setOptimistic(false);
      }
    },
    [executeCommand],
  );

  const smart = useSmartCommandInput({
    contextInput,
    suggestionsIdPrefix: 'global-suggestion',
  });
  const { setCommand, inputRef } = smart;

  useEffect(() => {
    const prefill = sessionStorage.getItem(COMMAND_PREFILL_STORAGE_KEY);
    if (prefill) {
      setCommand(prefill);
      sessionStorage.removeItem(COMMAND_PREFILL_STORAGE_KEY);
      inputRef.current?.focus();
    }
  }, [setCommand, inputRef]);

  const placeholder = useRotatingPlaceholder(!smart.isActive && !loading && !optimistic);
  const showLoading = loading || optimistic;
  const liveSteps = streamSteps.map((s) => ({
    label: s.label,
    summary: s.summary,
    done: s.done,
    checkpoint: s.checkpoint,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smart.command.trim() || showLoading) return;
    const cmd = smart.command.trim();
    smart.setCommand('');
    await runCommand(cmd);
  };

  const handleSuggestionClick = async (suggestion: DemoSuggestion) => {
    smart.setCommand(suggestion.command);
    smart.setActiveSuggestionId(suggestion.id);
    smart.inputRef.current?.focus();
    await runCommand(suggestion.command);
    smart.setCommand('');
  };

  const handleAdjustFromResult = useCallback(
    (originalCommand: string) => {
      smart.setCommand(originalCommand);
      smart.inputRef.current?.focus();
    },
    [smart],
  );

  const handleInputKeyDown = smart.createInputKeyDown({
    onSuggestionSelect: (s) => void handleSuggestionClick(s),
  });

  const suggestionsContent = (
    <CommandSuggestionsList
      isActive={smart.isActive}
      nowRelevant={smart.nowRelevant}
      suggestionGroups={smart.suggestionGroups}
      suggestions={smart.suggestions}
      keyboardIndex={smart.keyboardIndex}
      activeSuggestionId={smart.activeSuggestionId}
      onSuggestionClick={(s) => void handleSuggestionClick(s)}
      suggestionsIdPrefix="global-suggestion"
      suggestionsLoading={smart.suggestionsLoading && !smart.suggestionsError}
    />
  );

  return (
    <div className="max-w-5xl mx-auto w-full" data-testid="global-command-bar">
      <CommandBar
        variant="default"
        inputFocused={smart.focused}
        value={smart.command}
        onChange={smart.setCommand}
        onSubmit={handleSubmit}
        placeholder={placeholder}
        loading={showLoading}
        loadingLabel={t('command.brain.thinking')}
        disabled={showLoading}
        inputRef={smart.inputRef}
        onInputFocus={() => smart.setFocused(true)}
        onInputBlur={() => setTimeout(() => smart.setFocused(false), 150)}
        onInputKeyDown={handleInputKeyDown}
        onPaletteOpen={openPalette}
        voiceSupported={smart.voiceSupported}
        micActive={smart.listening}
        onMicToggle={smart.toggleVoice}
        voiceStatus={smart.listening ? t('commandCenter.voice.listening') : undefined}
        suggestionsExpanded={smart.isActive}
        suggestionsId="global-command-suggestions"
        activeDescendantId={smart.activeDescendantId}
        inputAriaLabel={t('a11y.commandInputLabel')}
        rotatingHintText={!smart.isActive ? placeholder : undefined}
        className="mb-0"
        intentPill={
          smart.showIntentPill ? (
            <div key={smart.detected.id} className="flex items-center gap-2 animate-fade-in">
              <span className="text-[10px] uppercase tracking-widest text-caption-accessible">
                Intent
              </span>
              <IntentPill label={smart.detected.label} confidence={smart.detected.confidence} />
            </div>
          ) : undefined
        }
        idleHint={
          !smart.isActive ? (
            <p className="mt-2 text-xs text-caption-accessible leading-relaxed px-0.5">
              {t('commandCenter.idleHint')}
            </p>
          ) : undefined
        }
        suggestions={suggestionsContent}
        responseSlot={
          <>
            {streaming && (
              <div className="mt-3 space-y-2" role="status" data-testid="command-stream-steps">
                {settings.explainabilityPrefs?.showLiveExplain !== false &&
                  settings.explainabilityPrefs?.detailLevel !== 'off' && (
                    <LiveExplainPanel
                      live={streamLiveExplain}
                      handoffChainLength={streamHandoffChain.length}
                    />
                  )}
                {streamHandoffChain.length > 0 && <HandoffChainRail chain={streamHandoffChain} />}
                {streamSharedMemory.length > 0 && (
                  <SharedMemoryRail entries={streamSharedMemory} defaultCollapsed />
                )}
                {streamActiveAgentKeys.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {streamExecutionMode && executionModeBadgeLabel(streamExecutionMode) && (
                        <span className="text-[10px] rounded-md border border-border/40 px-1.5 py-0.5 text-muted-foreground">
                          {executionModeBadgeLabel(streamExecutionMode)}
                        </span>
                      )}
                      {streamActiveAgentKeys.map((key) => (
                        <AgentBadge
                          key={key}
                          agentKey={key}
                          delegatedFrom="admin"
                          chainFrom={streamChainFrom ?? undefined}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {agentsWorkingParallelLabel(streamActiveAgentKeys)}
                    </p>
                  </div>
                )}
                {streamPlan && streamPlan.stepTotal > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t('command.brain.planTitle')}: {streamPlan.goal}
                    </p>
                    <StepProgressRail
                      stepIndex={streamPlan.currentStep}
                      stepTotal={streamPlan.stepTotal}
                    />
                  </div>
                )}
                {liveSteps.length > 0 && (
                  <AgentGroupedTimeline
                    steps={liveSteps}
                    plansByAgent={streamPlansByAgent}
                    executionMode={streamExecutionMode}
                  />
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-lg"
                  onClick={cancelStream}
                  data-testid="command-stream-stop"
                >
                  {t('command.brain.stopAgent')}
                </Button>
              </div>
            )}
            {lastResult && (
              <div className="mt-3" role="status">
                <CommandResultCard
                  result={lastResult}
                  onAdjust={handleAdjustFromResult}
                  onUndo={lastResult.undoable ? () => void undoLastCommand() : undefined}
                  onRetry={
                    lastResult.parsedIntent === 'ERROR'
                      ? () => void runCommand(lastResult.originalCommand ?? smart.command)
                      : undefined
                  }
                />
              </div>
            )}
            {error && !lastResult && (
              <CommandErrorCard
                message={error}
                onRetry={() => {
                  const cmd = smart.command.trim();
                  if (cmd) void runCommand(cmd);
                }}
              />
            )}
          </>
        }
      />
    </div>
  );
}
