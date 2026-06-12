import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import React from 'react';
import { applyMerchantAutonomy } from '@/lib/settings/applyMerchantAutonomy';
import { useDashboard } from '@/lib/DashboardContext';
import { useMerchantSettings } from '@/lib/settings/MerchantSettingsContext';
import type { DemoCommandResponse, DemoIntentId, LinkedInsightId } from '@/lib/localIntentMatcher';
import { intentToLinkedInsight } from '@/lib/localIntentMatcher';
import {
  applyCommandComplete,
  applyExecute,
  applyUndoRevert,
  clearJustAppeared,
  finalizeExiting,
  getInitialTodayReadyInsightsForHome,
  insightIdToDemoCommand,
  visibleInsightIds,
  type TodayReadyInsight,
  type TodayReadyInsightId,
} from '@/lib/todayReadyDemo';
import {
  APPROVALS_CLEARED_EVENT,
  APPROVALS_CHANGED_EVENT,
  type ApprovalsChangedDetail,
} from '@/lib/approvalsCommandCenterSync';
import { subscribeInsightAppeared } from '@/lib/aetherLiveBus';
import { useCommandDemoFlow } from '@/hooks/useCommandDemoFlow';
import { trackBusinessEvent } from '@/lib/observability/businessEvents';
import HomeActivityPreview from '@/components/home/HomeActivityPreview';
import HomeLandingSkeleton from '@/components/home/HomeLandingSkeleton';
import HomeOutcomeMetrics from '@/components/home/HomeOutcomeMetrics';
import HomeQuickActions from '@/components/home/HomeQuickActions';
import HomeTodaySummary from '@/components/home/HomeTodaySummary';
import HomeWelcomeHeader from '@/components/home/HomeWelcomeHeader';
import { useHomeLanding } from '@/hooks/useHomeLanding';
import CommandCenterApprovalSheet from './command-center/CommandCenterApprovalSheet';
import CommandCenterHeroBar from './command-center/CommandCenterHeroBar';
import TodayReadySection from './command-center/TodayReadySection';
import { renderableInsights } from '@/lib/todayReadyDemo';

const HIGHLIGHT_AUTO_CLEAR_MS = 5000;
const HIGHLIGHT_SEQUENCE_DELAY_MS = 300;
const EXIT_ANIMATION_MS = 350;
const AUTO_EXECUTE_AFTER_MS = 150;

export default function CommandCenterShell() {
  const { data: dashboard } = useDashboard();
  const { settings, loading: settingsLoading } = useMerchantSettings();
  const {
    viewModel: homeViewModel,
    activityItems,
    activitySource,
    highRiskPendingCount,
    loading: homeLoading,
    tenantDisplayName,
  } = useHomeLanding();
  const [activeIntent, setActiveIntent] = useState<DemoIntentId | null>(null);
  const [executedIntent, setExecutedIntent] = useState<DemoIntentId | null>(null);
  const [highlightInsightId, setHighlightInsightId] = useState<LinkedInsightId>(null);
  const [highlightGeneration, setHighlightGeneration] = useState(0);
  const [highlightPulse, setHighlightPulse] = useState(false);
  const [executedInsightId, setExecutedInsightId] = useState<LinkedInsightId>(null);
  const [insights, setInsights] = useState<TodayReadyInsight[]>(
    getInitialTodayReadyInsightsForHome,
  );
  const [approvalTarget, setApprovalTarget] = useState<DemoCommandResponse | null>(null);
  const [autoExecuteTrigger, setAutoExecuteTrigger] = useState(0);
  const [approvalConfirmedIntentId, setApprovalConfirmedIntentId] = useState<DemoIntentId | null>(
    null,
  );
  const sequenceTimerRef = useRef<number | null>(null);
  const autoClearTimerRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const overviewSequenceRef = useRef<LinkedInsightId[] | null>(null);
  const pendingAutoExecuteRef = useRef(false);
  const adjustCommandRef = useRef<((command: string) => void) | null>(null);

  useEffect(() => {
    const markApprovalsHandled = (prev: TodayReadyInsight[]) => {
      const card = prev.find((i) => i.id === 'approvals');
      if (!card?.visible || card.executed) return prev;
      return prev.map((i) =>
        i.id === 'approvals'
          ? {
              ...i,
              executed: true,
              exiting: true,
              title: 'Afgehandeld',
              updatedAt: Date.now(),
            }
          : i,
      );
    };

    const onApprovalsCleared = () => {
      setInsights(markApprovalsHandled);
    };

    const onApprovalsChanged = (event: Event) => {
      const count = (event as CustomEvent<ApprovalsChangedDetail>).detail?.pendingCount ?? 0;
      setInsights((prev) => {
        const card = prev.find((i) => i.id === 'approvals');
        if (!card?.visible) return prev;
        if (count === 0) return markApprovalsHandled(prev);
        return prev.map((i) =>
          i.id === 'approvals'
            ? {
                ...i,
                executed: false,
                exiting: false,
                title: count === 1 ? '1 high-risk' : `${count} high-risk`,
                confidence: { value: String(count), label: 'Wachten' },
                updatedAt: Date.now(),
              }
            : i,
        );
      });
    };

    window.addEventListener(APPROVALS_CLEARED_EVENT, onApprovalsCleared);
    window.addEventListener(APPROVALS_CHANGED_EVENT, onApprovalsChanged);
    return () => {
      window.removeEventListener(APPROVALS_CLEARED_EVENT, onApprovalsCleared);
      window.removeEventListener(APPROVALS_CHANGED_EVENT, onApprovalsChanged);
    };
  }, []);

  const clearSequenceTimer = useCallback(() => {
    if (sequenceTimerRef.current !== null) {
      window.clearTimeout(sequenceTimerRef.current);
      sequenceTimerRef.current = null;
    }
  }, []);

  const clearAutoClearTimer = useCallback(() => {
    if (autoClearTimerRef.current !== null) {
      window.clearTimeout(autoClearTimerRef.current);
      autoClearTimerRef.current = null;
    }
  }, []);

  const clearExitTimer = useCallback(() => {
    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  const triggerHighlight = useCallback((linkedInsightId: LinkedInsightId) => {
    setHighlightInsightId(linkedInsightId);
    setHighlightPulse(true);
    setHighlightGeneration((g) => g + 1);
  }, []);

  useEffect(() => {
    return subscribeInsightAppeared(({ insightId }) => {
      setInsights((prev) =>
        prev.map((i) =>
          i.id === insightId
            ? {
                ...i,
                visible: true,
                justAppeared: true,
                updatedAt: Date.now(),
                exiting: false,
              }
            : i,
        ),
      );
      triggerHighlight(insightId);
    });
  }, [triggerHighlight]);

  const runHighlightSequence = useCallback(
    (sequence: LinkedInsightId[]) => {
      clearSequenceTimer();
      clearAutoClearTimer();
      let index = 0;

      const step = () => {
        if (index < sequence.length) {
          triggerHighlight(sequence[index]!);
          index += 1;
          sequenceTimerRef.current = window.setTimeout(step, HIGHLIGHT_SEQUENCE_DELAY_MS);
        } else {
          setHighlightInsightId(null);
          setHighlightPulse(false);
          sequenceTimerRef.current = null;
        }
      };

      step();
    },
    [clearAutoClearTimer, clearSequenceTimer, triggerHighlight],
  );

  const scheduleExitFinalize = useCallback(() => {
    clearExitTimer();
    exitTimerRef.current = window.setTimeout(() => {
      setInsights((prev) => finalizeExiting(prev));
      exitTimerRef.current = null;
    }, EXIT_ANIMATION_MS);
  }, [clearExitTimer]);

  const handleExecute = useCallback(
    (intentId: DemoIntentId) => {
      trackBusinessEvent('autonomous.executed', { intentId, source: 'manual' });
      setExecutedIntent(intentId);
      setExecutedInsightId(intentToLinkedInsight(intentId));

      setInsights((prev) => {
        const next = applyExecute(prev, intentId);
        if (next.some((i) => i.exiting)) {
          scheduleExitFinalize();
        }
        return next;
      });
    },
    [scheduleExitFinalize],
  );

  const handleIntentClear = useCallback(() => {
    clearSequenceTimer();
    clearAutoClearTimer();
    setHighlightInsightId(null);
    setHighlightPulse(false);
    setActiveIntent(null);
    setExecutedIntent(null);
    setExecutedInsightId(null);
    setApprovalTarget(null);
    setApprovalConfirmedIntentId(null);
  }, [clearAutoClearTimer, clearSequenceTimer]);

  const handleApprovalRequest = useCallback((response: DemoCommandResponse) => {
    setApprovalTarget(response);
  }, []);

  const handleApprovalConfirm = useCallback(() => {
    if (!approvalTarget) return;
    setApprovalConfirmedIntentId(approvalTarget.intentId);
    handleExecute(approvalTarget.intentId);
    setApprovalTarget(null);
  }, [approvalTarget, handleExecute]);

  const handleApprovalReject = useCallback(() => {
    setApprovalTarget(null);
  }, []);

  const handleApprovalAdjust = useCallback(() => {
    if (!approvalTarget?.originalCommand) return;
    const command = approvalTarget.originalCommand;
    setApprovalTarget(null);
    adjustCommandRef.current?.(command);
  }, [approvalTarget]);

  const handleCommandComplete = useCallback(
    (linkedInsightId: LinkedInsightId, intentId: DemoIntentId, response: DemoCommandResponse) => {
      setActiveIntent(intentId);
      setExecutedIntent(null);
      setExecutedInsightId(null);
      clearSequenceTimer();
      clearAutoClearTimer();
      overviewSequenceRef.current = null;

      setInsights((prev) => {
        const next = applyCommandComplete(prev, response);
        if (intentId === 'INSIGHTS_OVERVIEW') {
          overviewSequenceRef.current = visibleInsightIds(next);
        }
        return next;
      });

      window.setTimeout(() => {
        setInsights((current) => clearJustAppeared(current));
      }, 450);

      if (intentId === 'INSIGHTS_OVERVIEW') {
        window.setTimeout(() => {
          if (overviewSequenceRef.current) {
            runHighlightSequence(overviewSequenceRef.current);
          }
        }, 400);
        return;
      }

      triggerHighlight(linkedInsightId);

      if (linkedInsightId) {
        autoClearTimerRef.current = window.setTimeout(() => {
          setHighlightInsightId(null);
          setHighlightPulse(false);
          autoClearTimerRef.current = null;
        }, HIGHLIGHT_AUTO_CLEAR_MS);
      }

      if (pendingAutoExecuteRef.current) {
        pendingAutoExecuteRef.current = false;
        const mode = applyMerchantAutonomy(settings, {
          requiresApproval: response.requiresApproval,
          riskBand: response.riskBand,
        });
        if (mode === 'autonomous') {
          trackBusinessEvent('autonomous.executed', {
            intentId,
            source: 'auto_trigger',
          });
          window.setTimeout(() => {
            setAutoExecuteTrigger((n) => n + 1);
          }, AUTO_EXECUTE_AFTER_MS);
        }
      }
    },
    [clearAutoClearTimer, clearSequenceTimer, runHighlightSequence, triggerHighlight, settings],
  );

  const suggestionContext = useMemo(
    () => ({ dashboard, todayReady: insights, settings }),
    [dashboard, insights, settings],
  );

  const demo = useCommandDemoFlow({
    suggestionContext,
    onCommandComplete: handleCommandComplete,
    onIntentClear: handleIntentClear,
    onExecute: handleExecute,
    onApprovalRequest: handleApprovalRequest,
  });

  const handleIntentChange = useCallback((intentId: DemoIntentId | null) => {
    setActiveIntent(intentId);
  }, []);

  const handleSyncSuppliers = useCallback(() => {
    void demo.runCommand('Check leveranciers op prijsdalingen');
  }, [demo]);

  const showTodayReady = useMemo(() => {
    if (highlightInsightId) return true;
    const visible = renderableInsights(insights);
    return visible.some((i) => !i.exiting);
  }, [insights, highlightInsightId]);

  const handleInsightActivate = useCallback(
    (insightId: TodayReadyInsightId) => {
      const mapping = insightIdToDemoCommand(insightId);
      if (mapping) {
        void demo.runCommand(mapping.command, mapping.intentId);
      }
    },
    [demo],
  );

  const handleCommandUndo = useCallback((intentId: DemoIntentId) => {
    setExecutedIntent(null);
    setExecutedInsightId(null);
    setInsights((prev) => applyUndoRevert(prev, intentId));
  }, []);

  const handleInsightExecute = useCallback(
    (insightId: TodayReadyInsightId) => {
      const mapping = insightIdToDemoCommand(insightId);
      if (!mapping) return;

      if (insightId === 'autonomous' || insightId === 'pricing' || insightId === 'supplier') {
        pendingAutoExecuteRef.current = true;
        void demo.runCommand(mapping.command, mapping.intentId);
        return;
      }

      handleExecute(mapping.intentId);
    },
    [demo, handleExecute],
  );

  useEffect(() => {
    return () => {
      clearSequenceTimer();
      clearAutoClearTimer();
      clearExitTimer();
    };
  }, [clearAutoClearTimer, clearExitTimer, clearSequenceTimer]);

  if (settingsLoading || homeLoading) {
    return <HomeLandingSkeleton />;
  }

  return (
    <div
      className="w-full max-w-5xl pt-1 sm:pt-2 motion-safe:animate-fade-in"
      data-testid="command-center-ready"
      data-active-intent={activeIntent ?? undefined}
      data-executed-intent={executedIntent ?? undefined}
      data-executed-insight={executedInsightId ?? undefined}
    >
      <div className="space-y-8 sm:space-y-10">
        <HomeWelcomeHeader tenantDisplayName={tenantDisplayName} />

        <HomeOutcomeMetrics viewModel={homeViewModel} />

        <HomeTodaySummary viewModel={homeViewModel} />

        <div className="space-y-4">
          <CommandCenterHeroBar
            demo={demo}
            todayReadyInsights={insights}
            onIntentChange={handleIntentChange}
            onIntentClear={handleIntentClear}
            onUndo={handleCommandUndo}
            autoExecuteTrigger={autoExecuteTrigger}
            onAutoExecuteComplete={handleExecute}
            approvalConfirmedIntentId={approvalConfirmedIntentId}
            adjustCommandRef={adjustCommandRef}
          />
          <HomeQuickActions
            highRiskPendingCount={highRiskPendingCount}
            onSyncSuppliers={handleSyncSuppliers}
          />
        </div>

        {showTodayReady && (
          <TodayReadySection
            insights={insights}
            highlightId={highlightInsightId}
            highlightGeneration={highlightGeneration}
            highlightPulse={highlightPulse}
            onActivate={handleInsightActivate}
            onExecute={handleInsightExecute}
          />
        )}

        <HomeActivityPreview items={activityItems} feedSource={activitySource} />
      </div>

      <CommandCenterApprovalSheet
        open={!!approvalTarget}
        response={approvalTarget}
        onConfirm={handleApprovalConfirm}
        onAdjust={handleApprovalAdjust}
        onReject={handleApprovalReject}
      />
    </div>
  );
}
