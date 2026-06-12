import { useEffect, useMemo, type MutableRefObject } from 'react';
import React from 'react';
import { useCommand } from '../../lib/CommandContext';
import { useDashboard } from '@/lib/DashboardContext';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import { t } from '@/lib/i18n';
import { CommandBar } from '@/components/ui';
import type { DemoIntentId, DemoSuggestion } from '@/lib/localIntentMatcher';
import type { TodayReadyInsight } from '@/lib/todayReadyDemo';
import { useRotatingPlaceholder } from '@/hooks/useRotatingPlaceholder';
import { useSmartCommandInput } from '@/hooks/useSmartCommandInput';
import type { useCommandDemoFlow } from '@/hooks/useCommandDemoFlow';
import CommandSuggestionsList from '@/components/command/CommandSuggestionsList';
import CommandErrorCard from '@/components/command/CommandErrorCard';
import CommandDemoResponse from './CommandDemoResponse';
import { IntentPill } from './primitives';

type DemoFlow = ReturnType<typeof useCommandDemoFlow>;

interface CommandCenterHeroBarProps {
  demo: DemoFlow;
  todayReadyInsights: TodayReadyInsight[];
  onIntentChange?: (intentId: DemoIntentId | null) => void;
  onIntentClear?: () => void;
  onUndo?: (intentId: DemoIntentId) => void;
  autoExecuteTrigger?: number;
  onAutoExecuteComplete?: (intentId: DemoIntentId) => void;
  approvalConfirmedIntentId?: DemoIntentId | null;
  adjustCommandRef?: MutableRefObject<((command: string) => void) | null>;
}

export default function CommandCenterHeroBar({
  demo,
  todayReadyInsights,
  onIntentChange,
  onIntentClear,
  onUndo,
  autoExecuteTrigger,
  onAutoExecuteComplete,
  approvalConfirmedIntentId,
  adjustCommandRef,
}: CommandCenterHeroBarProps) {
  const { openPalette } = useCommand();
  const { data: dashboard } = useDashboard();
  const { settings } = useMerchantSettings();

  const {
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
  } = demo;

  const contextInput = useMemo(
    () => ({ dashboard, todayReady: todayReadyInsights, settings }),
    [dashboard, todayReadyInsights, settings],
  );

  const forceSuggestionsOpen = demoResult?.intentId === 'UNKNOWN' && !demoLoading;

  const smart = useSmartCommandInput({
    contextInput,
    onIntentChange,
    forceSuggestionsOpen,
  });

  const placeholder = useRotatingPlaceholder(!smart.isActive && !demoLoading);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smart.command.trim() || demoLoading) return;
    const cmd = smart.command.trim();
    await runCommand(cmd);
    smart.setCommand('');
  };

  const handleSuggestionClick = async (suggestion: DemoSuggestion) => {
    smart.setCommand(suggestion.command);
    smart.setActiveSuggestionId(suggestion.id);
    smart.inputRef.current?.focus();
    await runCommand(suggestion.command, suggestion.intentId);
  };

  const handleInputKeyDown = smart.createInputKeyDown({
    onEscape: () => {
      clearDemoState();
      onIntentClear?.();
    },
    onSuggestionSelect: (s) => void handleSuggestionClick(s),
  });

  const handleAdjust = (originalCommand: string) => {
    smart.setCommand(originalCommand);
    clearDemoState();
    onIntentClear?.();
    smart.inputRef.current?.focus();
  };

  useEffect(() => {
    if (adjustCommandRef) {
      adjustCommandRef.current = handleAdjust;
    }
    return () => {
      if (adjustCommandRef) {
        adjustCommandRef.current = null;
      }
    };
  });

  const handleResponseDismiss = () => {
    smart.setCommand('');
    handleDismiss();
  };

  return (
    <CommandBar
      variant="hero"
      inputFocused={smart.focused}
      value={smart.command}
      onChange={smart.setCommand}
      onSubmit={handleSubmit}
      placeholder={placeholder}
      loading={demoLoading}
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
      suggestionsId="command-suggestions"
      activeDescendantId={smart.activeDescendantId}
      inputAriaLabel={t('a11y.commandInputLabel')}
      rotatingHintText={!smart.isActive ? placeholder : undefined}
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
          <p className="mt-2.5 text-xs text-caption-accessible leading-relaxed px-0.5">
            {t('commandCenter.idleHint')}
            {smart.voiceSupported && (
              <span className="text-caption-accessible"> · {t('commandCenter.voice.hint')}</span>
            )}
          </p>
        ) : undefined
      }
      suggestions={
        <CommandSuggestionsList
          isActive={smart.isActive}
          nowRelevant={smart.nowRelevant}
          suggestionGroups={smart.suggestionGroups}
          suggestions={smart.suggestions}
          keyboardIndex={smart.keyboardIndex}
          activeSuggestionId={smart.activeSuggestionId}
          onSuggestionClick={(s) => void handleSuggestionClick(s)}
          suggestionsLoading={smart.suggestionsLoading}
        />
      }
      responseSlot={
        <div ref={responseRef}>
          {demoError && !demoLoading && !demoResult && (
            <CommandErrorCard
              message={demoError}
              onRetry={() => {
                const cmd = smart.command.trim();
                if (cmd) void runCommand(cmd);
              }}
            />
          )}
          {(demoLoading || demoResult) && (
            <CommandDemoResponse
              response={demoResult}
              loading={demoLoading}
              loadingPhase={loadingPhase}
              loadingProgress={loadingProgress}
              stepIndex={stepIndex}
              stepTotal={stepTotal}
              onAdjust={handleAdjust}
              onUndo={onUndo}
              autoExecuteTrigger={autoExecuteTrigger}
              onExecute={handleExecute}
              onAutoExecuteComplete={onAutoExecuteComplete}
              onDismiss={handleResponseDismiss}
              approvalConfirmedIntentId={approvalConfirmedIntentId}
            />
          )}
        </div>
      }
    />
  );
}
